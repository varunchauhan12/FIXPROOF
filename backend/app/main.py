
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
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


class DiagnoseRequest(BaseModel):
    issue_description: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FixProof API"}


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
