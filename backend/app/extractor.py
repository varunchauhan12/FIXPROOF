"""
Video frame extraction module for FixProof.
Ported from MediaGuard Sports Archivist logic (agents/archivist.py).
Samples keyframes at regular intervals (default: 1 frame every 5 seconds)
using OpenCV VideoCapture and records timestamp metadata.
"""

from pathlib import Path
from typing import Any, Dict, List, Tuple
import cv2


def extract_video_frames(
    video_path: Path,
    output_dir: Path,
    sample_interval_sec: int = 5,
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Extracts frames from a video file at regular intervals.
    Mirrors the MediaGuard sports archivist sampling logic:
      - 1 frame every 5 seconds (frame_id % (frame_rate * 5) == 0)
      - Records timestamp_sec = extracted_count * sample_interval_sec
      - Saves frames as JPEG images in output_dir

    Args:
        video_path: Path to the video file on disk.
        output_dir: Directory where extracted JPEG frames will be saved.
        sample_interval_sec: Interval in seconds between extracted frames (default 5).

    Returns:
        A tuple of (duration_seconds, extracted_frames_metadata_list).

    Raises:
        ValueError: If the video cannot be opened, has no readable frames, or is corrupted.
        IOError: If writing a frame image fails.
    """
    if not video_path.exists():
        raise ValueError(f"Video file does not exist: {video_path}")

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path.name}")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_rate = int(round(fps)) if (fps and fps > 0) else 1
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        duration_sec = 0.0
        if total_frames > 0 and frame_rate > 0:
            duration_sec = round(total_frames / frame_rate, 2)

        sample_interval = frame_rate * sample_interval_sec
        if sample_interval < 1:
            sample_interval = 1

        output_dir.mkdir(parents=True, exist_ok=True)
        extracted_frames: List[Dict[str, Any]] = []
        extracted_count = 0
        last_frame_id = -1

        while cap.isOpened():
            frame_id = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
            ret, frame = cap.read()
            if not ret:
                break
            last_frame_id = frame_id

            if frame_id % sample_interval == 0:
                timestamp_sec = extracted_count * sample_interval_sec
                frame_filename = f"frame_{timestamp_sec:04d}s.jpg"
                frame_path = output_dir / frame_filename

                success = cv2.imwrite(str(frame_path), frame)
                if not success:
                    raise IOError(f"Failed to write extracted frame to {frame_path}")

                extracted_frames.append({
                    "frame_index": extracted_count,
                    "frame_id": frame_id,
                    "timestamp_sec": timestamp_sec,
                    "filename": frame_filename,
                    "frame_path": str(frame_path),
                })
                extracted_count += 1

        if extracted_count == 0:
            raise ValueError("Video contains no readable frames or is corrupted.")

        if duration_sec == 0.0 and frame_rate > 0 and last_frame_id >= 0:
            duration_sec = round((last_frame_id + 1) / frame_rate, 2)

        return duration_sec, extracted_frames

    finally:
        cap.release()
