"""
Visual Matching and Perceptual Hashing module for FixProof.
Ported from MediaGuard Sports Sentinel (agents/sentinel.py).

Features:
- Queries the existing FAISS Reference Vault using MobileNetV3 (576-dim) embeddings.
- Layer 1: L2 similarity search with confidence scoring and candidate match thresholding.
- Layer 2: pHash verification (using imagehash.phash) comparing suspect vs. matched reference frames.
- Strictly prevents self-matching against the submitted asset.
- All outputs represent candidate visual similarity, not definitive legal findings.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import logging

import imagehash
import numpy as np
from PIL import Image

from app.vault import ReferenceVault, extract_image_embedding

logger = logging.getLogger(__name__)

MATCH_THRESHOLD = 0.55    # L2 distance < 0.55 -> confirmed candidate visual match
SUSPECT_THRESHOLD = 0.75  # L2 distance < 0.75 -> suspect match (triggers pHash check)
PHASH_MATCH_HAMMING_THRESHOLD = 15  # Hamming distance < 15 -> perceptual hash match confirmed


def l2_to_confidence(distance: float) -> float:
    """Converts L2 distance between normalized vectors to a 0-100% confidence score."""
    return round(max(0.0, (1.0 - distance / 2.0)) * 100, 2)


def severity_from_confidence(confidence: float) -> str:
    """Classifies match severity from confidence percentage."""
    if confidence >= 85.0:
        return "CRITICAL"
    if confidence >= 60.0:
        return "WARNING"
    return "INFO"


def compute_phash_evidence(
    suspect_img: Image.Image,
    ref_img: Image.Image,
) -> Dict[str, Any]:
    """
    Computes perceptual hash comparison between suspect and matched reference frame.
    Returns hamming distance, pHash match flag, and 0-100 score.
    """
    suspect_hash = imagehash.phash(suspect_img)
    ref_hash = imagehash.phash(ref_img)
    hamming_diff = int(suspect_hash - ref_hash)
    phash_score = max(0, 100 - (hamming_diff * 4))
    phash_match = bool(hamming_diff < PHASH_MATCH_HAMMING_THRESHOLD)

    return {
        "suspect_phash": str(suspect_hash),
        "matched_phash": str(ref_hash),
        "hamming_distance": hamming_diff,
        "phash_score": phash_score,
        "phash_match": phash_match,
    }


def match_single_frame(
    suspect_img: Image.Image,
    submitted_asset_id: str,
    vault: ReferenceVault,
    k: int = 3,
) -> Optional[Dict[str, Any]]:
    """
    Searches the FAISS vault for the best candidate match for a single frame,
    excluding any vectors belonging to the submitted asset (prevents self-matching).
    """
    if vault.vector_db.ntotal == 0:
        return None

    suspect_embedding = extract_image_embedding(suspect_img)

    # Query up to 20 neighbors so we can filter out self-matches
    query_k = min(vault.vector_db.ntotal, max(k * 4, 10))
    distances, indices = vault.vector_db.search(suspect_embedding, query_k)

    candidates = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        meta = vault.metadata_store.get(str(idx), {})

        # Prevent self-matching
        if meta.get("asset_id") == submitted_asset_id:
            continue

        l2_dist = float(round(float(dist), 4))
        confidence = l2_to_confidence(l2_dist)

        candidates.append({
            "vector_id": int(idx),
            "source_asset_id": meta.get("asset_id", "unknown"),
            "source_frame_id": meta.get("frame_id", 0),
            "source_timestamp_sec": meta.get("timestamp_sec", 0),
            "source_filename": meta.get("filename", ""),
            "source_frame_path": meta.get("frame_path", ""),
            "l2_distance": l2_dist,
            "confidence_score": confidence,
            "severity": severity_from_confidence(confidence),
            "match_confirmed": bool(l2_dist < MATCH_THRESHOLD),
        })

        if len(candidates) >= k:
            break

    if not candidates:
        return None

    best = candidates[0]

    # Layer 2: pHash cross-check if candidate is within suspect threshold
    phash_evidence = None
    if best["l2_distance"] < SUSPECT_THRESHOLD:
        ref_path = Path(best.get("source_frame_path", ""))
        if ref_path.exists():
            try:
                with Image.open(ref_path) as ref_pil:
                    phash_evidence = compute_phash_evidence(suspect_img, ref_pil)
            except Exception as e:
                logger.warning(f"[Matcher] Could not compute pHash against {ref_path}: {e}")

    best["phash_match"] = phash_evidence["phash_match"] if phash_evidence else False
    best["phash_score"] = phash_evidence["phash_score"] if phash_evidence else 0
    best["phash_evidence"] = phash_evidence

    return {
        "best_match": best,
        "top_candidates": candidates,
    }


def analyze_asset_matches(
    submitted_asset_id: str,
    frames_dir: Path,
    vault: ReferenceVault,
    k_candidates: int = 3,
) -> Dict[str, Any]:
    """
    Analyzes all extracted frames of an already-uploaded video against the FAISS reference vault.

    Returns:
        Structured candidate similarity review containing match statistics,
        timestamps, distance scores, and perceptual hash evidence.
    """
    disclaimer = "Candidate visual similarity only; not a definitive copyright-infringement finding."

    if not frames_dir.exists():
        raise FileNotFoundError(
            f"Asset '{submitted_asset_id}' not found. No extracted frames directory at {frames_dir}"
        )

    frame_files = sorted(frames_dir.glob("frame_*.jpg"))
    if not frame_files:
        raise ValueError(
            f"No extracted JPEG frames found for asset '{submitted_asset_id}'."
        )

    # Check if vault has any external vectors
    external_vectors_exist = False
    for meta in vault.metadata_store.values():
        if meta.get("asset_id") != submitted_asset_id:
            external_vectors_exist = True
            break

    if vault.vector_db.ntotal == 0 or not external_vectors_exist:
        return {
            "submitted_asset_id": submitted_asset_id,
            "disclaimer": disclaimer,
            "total_frames_analyzed": len(frame_files),
            "candidate_matches_found": 0,
            "highest_confidence": 0.0,
            "lowest_l2_distance": None,
            "overall_status": "NO_REFERENCE_DATA",
            "message": "Reference vault is empty or contains no external reference videos.",
            "matched_assets": [],
            "frame_matches": [],
        }

    frame_matches = []
    highest_confidence = 0.0
    lowest_l2_distance = float("inf")
    matched_asset_ids = set()
    confirmed_match_count = 0

    for idx, fpath in enumerate(frame_files):
        # Extract timestamp from filename: frame_0005s.jpg -> 5
        timestamp_sec = idx * 5
        try:
            parts = fpath.stem.split("_")
            if len(parts) > 1:
                timestamp_sec = int(parts[1].replace("s", ""))
        except Exception:
            pass

        try:
            with Image.open(fpath) as img:
                match_result = match_single_frame(
                    suspect_img=img,
                    submitted_asset_id=submitted_asset_id,
                    vault=vault,
                    k=k_candidates,
                )
        except Exception as e:
            logger.error(f"[Matcher] Error reading frame {fpath}: {e}")
            continue

        frame_info = {
            "frame_index": idx,
            "timestamp_sec": timestamp_sec,
            "filename": fpath.name,
            "frame_path": str(fpath),
        }

        if match_result and match_result.get("best_match"):
            best = match_result["best_match"]
            conf = best["confidence_score"]
            dist = best["l2_distance"]

            if conf > highest_confidence:
                highest_confidence = conf
            if dist < lowest_l2_distance:
                lowest_l2_distance = dist

            if best["match_confirmed"]:
                confirmed_match_count += 1
                matched_asset_ids.add(best["source_asset_id"])
            elif dist < SUSPECT_THRESHOLD:
                matched_asset_ids.add(best["source_asset_id"])

            frame_matches.append({
                "submitted_frame": frame_info,
                "best_match": best,
                "top_candidates": match_result.get("top_candidates", []),
            })
        else:
            frame_matches.append({
                "submitted_frame": frame_info,
                "best_match": None,
                "top_candidates": [],
            })

    if lowest_l2_distance == float("inf"):
        lowest_l2_distance = None

    if confirmed_match_count > 0:
        overall_status = "CANDIDATE_MATCH"
    elif highest_confidence >= 62.5:  # L2 distance < 0.75
        overall_status = "SUSPECT"
    else:
        overall_status = "CLEAN"

    return {
        "submitted_asset_id": submitted_asset_id,
        "disclaimer": disclaimer,
        "total_frames_analyzed": len(frame_files),
        "candidate_matches_found": confirmed_match_count,
        "highest_confidence": highest_confidence,
        "lowest_l2_distance": lowest_l2_distance,
        "overall_status": overall_status,
        "matched_assets": sorted(list(matched_asset_ids)),
        "frame_matches": frame_matches,
    }
