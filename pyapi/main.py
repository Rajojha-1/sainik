from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List

app = FastAPI(title="Sainik Shifa Setu Python API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMES = [
    {"name": "Education Scholarship A", "tags": ["education", "family"], "description": "Scholarship for soldiers’ children"},
    {"name": "Medical Assistance B", "tags": ["medical", "veteran"], "description": "Medical support for veterans"},
    {"name": "Housing Subsidy C", "tags": ["housing", "soldier"], "description": "Affordable housing scheme"},
    {"name": "Pension Support D", "tags": ["pension", "veteran"], "description": "Enhanced pension support"},
]

@app.get("/api/health")
def health():
    return {"ok": True, "service": "python", "time": __import__("datetime").datetime.utcnow().isoformat()}

@app.get("/api/recommendations", response_model=List[dict])
def recommendations(role: str | None = None):
    if not role:
        return []
    role = role.lower()
    return [s for s in SCHEMES if role in s.get("tags", [])]

