from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from orchestrator.orchestrator import Orchestrator
import time
import os
import uvicorn

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "backend", "prisma", "dev.db")
orchestrator = Orchestrator(db_path=DB_PATH)

app = FastAPI(title="Smart Medical Passport AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from agents.vision_agent import VisionAgent
from pydantic import BaseModel

class VisionRequest(BaseModel):
    file_path: str
    patient_id: str

@app.post("/vision/process")
async def process_prescription_image(req: VisionRequest):
    try:
        agent = VisionAgent(req.file_path)
        result = agent.run()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patient/{patient_id}/context")
async def get_patient_context(
    patient_id: str, 
    encounter_type: str = "general",
    x_clinician_id: str = Header(None) # for audit logging
):
    t0 = time.time()
    try:
        # Run the parallel agent orchestration
        brief = orchestrator.run(patient_id, encounter_type)
        
        latency = round((time.time() - t0) * 1000)
        return {
            "patient_id": patient_id,
            "latency_ms": latency,
            "clinician_id": x_clinician_id,
            "brief": brief
        }
    except Exception as e:
        print(f"Orchestration Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "active", "timestamp": time.time()}

class RecommendRequest(BaseModel):
    issue: str
    hospitals: list[dict]

@app.post("/api/recommend-hospital")
async def recommend_hospital(req: RecommendRequest):
    try:
        # Simple logic for hospital recommendation based on specialty match
        # In a real scenario, this would call an LLM
        issue_lower = req.issue.lower()
        recommendation = "I recommend checking with a General Physician."
        
        for h in req.hospitals:
            if h.get('specialties') and any(s.lower() in issue_lower for s in h['specialties'].split(', ')):
                recommendation = f"I recommend {h['name']} based on their expertise in related specialties."
                break
        
        return {"recommendation": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
