"""
Asset Registry and Incident Storage module for FixProof.
Maintains persistent records of official reference assets and threat scan incidents.
"""

from datetime import datetime, timezone
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

STORAGE_ROOT = Path(__file__).resolve().parent.parent / "storage"
VIDEOS_DIR = STORAGE_ROOT / "videos"
FRAMES_DIR = STORAGE_ROOT / "frames"
ASSETS_META_FILE = STORAGE_ROOT / "assets_metadata.json"
INCIDENTS_FILE = STORAGE_ROOT / "incidents.json"

# Ensure directories exist
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
FRAMES_DIR.mkdir(parents=True, exist_ok=True)


def load_assets_metadata() -> Dict[str, Dict[str, Any]]:
    """Loads asset metadata from storage/assets_metadata.json."""
    if not ASSETS_META_FILE.exists():
        return {}
    try:
        with open(ASSETS_META_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[Registry] Failed to read {ASSETS_META_FILE}: {e}")
        return {}


def save_assets_metadata(metadata: Dict[str, Dict[str, Any]]) -> None:
    """Persists asset metadata to storage/assets_metadata.json safely."""
    try:
        with open(ASSETS_META_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"[Registry] Failed to write {ASSETS_META_FILE}: {e}")


def register_asset(
    asset_id: str,
    filename: str,
    stored_filename: str,
    file_size: int,
    content_type: str,
    duration_seconds: float,
    frame_count: int,
    frames: List[Dict[str, Any]],
    auto_indexed: bool = False,
) -> Dict[str, Any]:
    """Registers a newly uploaded official reference asset."""
    all_meta = load_assets_metadata()

    record = {
        "asset_id": asset_id,
        "filename": filename,
        "stored_filename": stored_filename,
        "file_size": file_size,
        "content_type": content_type,
        "duration_seconds": duration_seconds,
        "frame_count": frame_count,
        "sample_interval_seconds": 5,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "is_reference": True,
        "auto_indexed": auto_indexed,
    }

    all_meta[asset_id] = record
    save_assets_metadata(all_meta)
    return record


def get_asset_frames_list(asset_id: str) -> List[Dict[str, Any]]:
    """Discovers all extracted frames for an asset and builds client-friendly descriptors."""
    asset_dir = FRAMES_DIR / asset_id
    if not asset_dir.exists():
        return []

    frame_files = sorted(asset_dir.glob("frame_*.jpg"))
    frames = []
    for idx, fpath in enumerate(frame_files):
        ts = idx * 5
        try:
            parts = fpath.stem.split("_")
            if len(parts) > 1:
                ts = int(parts[1].replace("s", ""))
        except Exception:
            pass

        frames.append({
            "frame_index": idx,
            "timestamp_sec": ts,
            "filename": fpath.name,
            "url": f"/api/vault/assets/{asset_id}/frames/{fpath.name}",
        })
    return frames


def list_registered_assets(vault: Any) -> List[Dict[str, Any]]:
    """
    Lists all official reference assets with live indexing status from FAISS vault.
    Reconciles stored metadata with on-disk video/frame storage and FAISS vector counts.
    """
    all_meta = load_assets_metadata()
    discovered_ids = set(all_meta.keys())

    # Include any assets explicitly indexed in the reference vault
    for meta in vault.metadata_store.values():
        aid = meta.get("asset_id")
        if aid:
            discovered_ids.add(aid)

    # Auto-discover official reference videos on disk (exclude suspect files)
    for f in VIDEOS_DIR.iterdir():
        if f.is_file() and not f.name.startswith(".") and not f.name.startswith("suspect_"):
            asset_id = f.stem
            discovered_ids.add(asset_id)


    # Compute vector counts per asset from vault.metadata_store
    vector_counts: Dict[str, int] = {}
    for meta in vault.metadata_store.values():
        aid = meta.get("asset_id")
        if aid:
            vector_counts[aid] = vector_counts.get(aid, 0) + 1

    asset_list = []
    for asset_id in discovered_ids:
        frames = get_asset_frames_list(asset_id)
        if not frames and not (VIDEOS_DIR / f"{asset_id}.mp4").exists():
            continue

        meta = all_meta.get(asset_id, {})
        video_files = list(VIDEOS_DIR.glob(f"{asset_id}.*"))
        stored_file = video_files[0] if video_files else None

        filename = meta.get("filename")
        if not filename and stored_file:
            filename = stored_file.name
        elif not filename:
            filename = f"asset_{asset_id[:8]}.mp4"

        file_size = meta.get("file_size")
        if file_size is None and stored_file and stored_file.exists():
            file_size = stored_file.stat().st_size
        elif file_size is None:
            file_size = 0

        uploaded_at = meta.get("uploaded_at")
        if not uploaded_at and stored_file and stored_file.exists():
            uploaded_at = datetime.fromtimestamp(stored_file.stat().st_mtime, tz=timezone.utc).isoformat()
        elif not uploaded_at:
            uploaded_at = datetime.now(timezone.utc).isoformat()

        duration = meta.get("duration_seconds")
        if duration is None:
            duration = max(0.0, float((len(frames) - 1) * 5)) if frames else 0.0

        indexed_vec_count = vector_counts.get(asset_id, 0)
        is_indexed = indexed_vec_count > 0

        asset_list.append({
            "asset_id": asset_id,
            "filename": filename,
            "uploaded_at": uploaded_at,
            "duration_seconds": duration,
            "frame_count": len(frames),
            "file_size": file_size,
            "indexed": is_indexed,
            "indexed_vectors": indexed_vec_count,
            "sample_interval_seconds": 5,
            "video_url": f"/api/vault/assets/{asset_id}/video" if stored_file else None,
            "thumbnail_url": frames[0]["url"] if frames else None,
            "frames": frames,
        })

    # Sort most recently uploaded first
    asset_list.sort(key=lambda a: a.get("uploaded_at", ""), reverse=True)
    return asset_list


def get_asset_detail(asset_id: str, vault: Any) -> Optional[Dict[str, Any]]:
    """Gets complete metadata and frames for a specific asset."""
    assets = list_registered_assets(vault)
    for a in assets:
        if a["asset_id"] == asset_id:
            return a
    return None


def delete_asset_record(asset_id: str, vault: Any) -> bool:
    """Removes an asset from storage, frame cache, and FAISS vault."""
    all_meta = load_assets_metadata()
    if asset_id in all_meta:
        del all_meta[asset_id]
        save_assets_metadata(all_meta)

    # Delete video files
    for f in VIDEOS_DIR.glob(f"{asset_id}.*"):
        f.unlink(missing_ok=True)

    # Delete frames directory
    asset_frames_dir = FRAMES_DIR / asset_id
    if asset_frames_dir.exists():
        import shutil
        shutil.rmtree(asset_frames_dir, ignore_errors=True)

    # Remove vectors from vault if present
    vault.remove_asset_vectors(asset_id)
    return True


# ─── Incidents & Scans Storage ───────────────────────────────────────────────

def load_incidents() -> List[Dict[str, Any]]:
    """Loads recorded threat scan incidents."""
    if not INCIDENTS_FILE.exists():
        return []
    try:
        with open(INCIDENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[Registry] Failed to read {INCIDENTS_FILE}: {e}")
        return []


def save_incident(incident_data: Dict[str, Any]) -> None:
    """Appends an incident to the persistent incidents log."""
    incidents = load_incidents()
    # Prepend new incident so newest is first
    incidents.insert(0, incident_data)
    # Keep up to 100 recent incidents
    incidents = incidents[:100]
    try:
        with open(INCIDENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(incidents, f, indent=2)
    except Exception as e:
        logger.error(f"[Registry] Failed to write {INCIDENTS_FILE}: {e}")
