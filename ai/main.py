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

try:
    model = genai.GenerativeModel('gemini-2.5-flash')
except:
    model = genai.GenerativeModel('gemini-1.5-pro')

class SynthesisRequest(BaseModel):
    patient_name: str
    doctor_specialty: str
    records: list
    allergies: str
    chronic_conditions: str

class ChatRequest(BaseModel):
    patient_name: str
    question: str
    records: list
    allergies: str
    chronic_conditions: str

@app.post("/api/synthesize")
async def synthesize_records(req: SynthesisRequest):
    if not req.records:
        return {"summary": "No accessible medical records found for this patient.", "is_structured": False}
    
    records_text = "\n".join([
        f"- [{r['date']}] {r['type']} ({r['specialty']}): {r['title']} -> {r['content']}"
        for r in req.records
    ])

    if req.doctor_specialty == "Patient Self-Review":
        # Generate Patient Dashboard Insights
        prompt = f"""
        You are a helpful AI health assistant for a patient named {req.patient_name}.
        Analyze their medical history and provide meaningful Health Insights.

        Allergies: {req.allergies}
        Chronic Conditions: {req.chronic_conditions}
        Records:
        {records_text}

        Instructions:
        1. Identify overall health trends (e.g., blood pressure, repeated issues).
        2. Provide risk alerts if necessary.
        3. Offer personalized, general wellness suggestions.
        Keep it encouraging and easy to understand (avoid overly complex medical jargon).
        Format your response nicely with bullet points. Do not hallucinante.
        """
        try:
            response = model.generate_content(prompt)
            summary_text = response.text
        except Exception as e:
            print("Gemini API failed:", e)
            summary_text = f"### AI Health Insights for {req.patient_name}\n\n"
            summary_text += f"- **Allergies:** {req.allergies}\n"
            summary_text += f"- **Chronic Conditions:** {req.chronic_conditions}\n"
            summary_text += f"- **Recent Activity:** Found {len(req.records)} medical records across different specialties.\n"
            summary_text += f"\n*Note: This is a local fallback summary because the Gemini API Key is missing or invalid.*"
            
        return {"summary": summary_text, "is_structured": False}
    else:
        # Generate Doctor 10-Second Snapshot
        prompt = f"""
        You are the 'Patient Memory Layer' AI. Provide a 10-second snapshot for a {req.doctor_specialty}.
        
        Patient Name: {req.patient_name}
        Allergies: {req.allergies}
        Chronic Conditions: {req.chronic_conditions}
        
        Records:
        {records_text}

        Instructions:
        Return exactly 4 sections clearly labeled:
        1. Conditions (List the most relevant chronic/past conditions)
        2. Allergies (List known allergies)
        3. Current Medications (Extract active medications from records)
        4. Key Risks (Predict risk complications or drug interactions based on {req.doctor_specialty} context)
        
        Keep each section extremely brief (bullet points). Do NOT hallucinate data.
        """
        try:
            response = model.generate_content(prompt)
            summary_text = response.text
        except Exception as e:
            print("Gemini API failed:", e)
            summary_text = f"### 10-Second Snapshot for {req.doctor_specialty}\n\n"
            summary_text += f"**1. Conditions:** {req.chronic_conditions}\n\n"
            summary_text += f"**2. Allergies:** {req.allergies}\n\n"
            summary_text += f"**3. Current Medications:** Please check timeline for prescriptions.\n\n"
            summary_text += f"**4. Key Risks:** None immediately identified via fallback.\n\n"
            summary_text += f"\n*Note: This is a local fallback summary because the Gemini API Key is missing or invalid.*"
            
        return {"summary": summary_text, "is_structured": True}

@app.post("/api/chat")
async def chat_with_data(req: ChatRequest):
    if not req.records:
        return {"answer": "I cannot answer as the patient has revoked access to their records."}

    records_text = "\n".join([
        f"- [{r['date']}] {r['type']} ({r['specialty']}): {r['title']} -> {r['content']}"
        for r in req.records
    ])

    prompt = f"""
    You are a medical AI assistant answering questions about a patient named {req.patient_name}.
    You have access to their medical records.

    Allergies: {req.allergies}
    Chronic Conditions: {req.chronic_conditions}
    Records:
    {records_text}

    The doctor asks: "{req.question}"
    
    Instructions:
    Answer the doctor's question directly and concisely based ONLY on the provided records. 
    If the information is not in the records, say "I don't have information on that in the current records."
    Do not guess or give general medical advice.
    """
    try:
        response = model.generate_content(prompt)
        return {"answer": response.text}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Chat failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
