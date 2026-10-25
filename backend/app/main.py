
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="FixProof API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


import shutil
from app.extractor import extract_video_frames

# Storage directory for official reference videos and extracted frames
STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "videos"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
FRAMES_DIR = Path(__file__).resolve().parent.parent / "storage" / "frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

# Allowed video extensions and 50 MB size limit for reference uploads
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE_BYTES = 1024 * 1024          # 1 MB chunk for streaming



class DiagnoseRequest(BaseModel):
    issue_description: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FixProof API"}

@app.post("/api/vault/ingest")
async def ingest_reference_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was provided.")
    # 1. Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{file_ext}'. "
                f"Allowed video formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )
    # 2. Generate unique asset ID (storage path never uses original filename)
    asset_id = str(uuid.uuid4())
    stored_filename = f"{asset_id}{file_ext}"
    target_path = STORAGE_DIR / stored_filename
    asset_frames_dir = FRAMES_DIR / asset_id
    total_bytes = 0

    try:
        # 3. Stream chunks to disk and enforce size limit
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(CHUNK_SIZE_BYTES):
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File exceeds maximum allowed size of "
                            f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
                        ),
                    )
                buffer.write(chunk)
        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # 4. Extract video frames using MediaGuard sampling logic (1 frame every 5s)
        duration_sec, extracted_frames = extract_video_frames(
            video_path=target_path,
            output_dir=asset_frames_dir,
            sample_interval_sec=5,
        )

        return {
            "status": "uploaded",
            "asset_id": asset_id,
            "filename": file.filename,
            "file_size": total_bytes,
            "content_type": file.content_type,
            "duration_seconds": duration_sec,
            "frame_count": len(extracted_frames),
            "sample_interval_seconds": 5,
            "frames": extracted_frames,
        }
    except HTTPException:
        # Clean up any partially written video and frame directory on HTTP exceptions
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        if asset_frames_dir.exists():
            shutil.rmtree(asset_frames_dir, ignore_errors=True)
        raise
    except ValueError as ve:
        # Handle unreadable, corrupted, or 0-frame videos
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        if asset_frames_dir.exists():
            shutil.rmtree(asset_frames_dir, ignore_errors=True)
        raise HTTPException(
            status_code=422,
            detail=f"Invalid or unreadable video: {ve}",
        )
    except Exception as err:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        if asset_frames_dir.exists():
            shutil.rmtree(asset_frames_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process video: {err}",
        )
    finally:
        await file.close()      


@app.post("/diagnose")
def diagnose(request: DiagnoseRequest):
    api_key = os.getenv("NEBIUS_API_KEY")
    model = os.getenv(
        "NEBIUS_MODEL",
        "nvidia/Nemotron-3_5-Lightning",
    )

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="NEBIUS_API_KEY is not configured",
        )

    client = OpenAI(
        base_url="https://api.tokenfactory.nebius.com/v1/",
        api_key=api_key,
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are FixProof, a Python debugging assistant. "
                        "Explain the likely cause of a bug report, "
                        "identify what evidence would be needed, "
                        "and suggest a safe next debugging step. "
                        "Do not claim you inspected code or ran tests "
                        "unless you actually did."
                    ),
                },
                {
                    "role": "user",
                    "content": request.issue_description,
                },
            ],
            max_tokens=500,
            temperature=0.1,
        )

        return {
            "diagnosis": (
                response.choices[0].message.content or ""
            ),
            "model": model,
            "provider": "Nebius Token Factory",
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="The model request failed. Check the backend logs.",
        )
