from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# Use a standard Gemini model
try:
    model = genai.GenerativeModel('gemini-2.5-flash')
except:
    model = genai.GenerativeModel('gemini-1.5-pro')

class SynthesisRequest(BaseModel):
    patient_name: str
    doctor_specialty: str
    records: list

@app.post("/api/synthesize")
async def synthesize_records(req: SynthesisRequest):
    if not req.records:
        return {"summary": "No accessible medical records found for this patient."}
    
    # Format the records for the prompt
    records_text = "\n".join([
        f"- [{r['date']}] {r['type']} ({r['specialty']}): {r['title']} -> {r['content']}"
        for r in req.records
    ])

    prompt = f"""
    You are a medical AI assistant acting as the 'Patient Memory Layer'.
    Your job is to synthesize a patient's medical records into a concise, highly relevant summary 
    tailored specifically for a doctor at the point of care.

    Patient Name: {req.patient_name}
    Doctor's Specialty: {req.doctor_specialty}

    Raw Medical Records (filtered by patient consent):
    {records_text}

    Instructions:
    1. Summarize the most important information relevant to the doctor's specialty ({req.doctor_specialty}).
    2. Mention any critical cross-specialty warnings (e.g., allergies or major conditions) if they are present in the provided records.
    3. Keep it professional, brief, and structured with bullet points.
    4. Do NOT hallucinate data. Only use the provided records.
    """

    try:
        response = model.generate_content(prompt)
        return {"summary": response.text}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Failed to synthesize memory layer")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
