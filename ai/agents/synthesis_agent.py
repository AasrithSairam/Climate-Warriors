from .base_agent import BaseAgent

class SynthesisAgent(BaseAgent):


    def __init__(self, patient_id, consent_scope, encounter_type: str):
        super().__init__(patient_id, consent_scope)
        self.encounter_type = encounter_type

    def run(self, agent_outputs: list[dict]) -> dict:
        system = f"""You are a clinical synthesis AI generating a
point-of-care brief for a clinician. The encounter type is: {self.encounter_type}.
Keep the narrative extremely concise (max 3 sentences).
Merge the outputs from all specialist agents. Deduplicate overlapping findings.
Rank information by clinical relevance to THIS encounter type.
Return ONLY valid JSON:
{{
  "clinical_brief": {{
    "narrative": "A high-level human-readable clinical summary",
    "critical_flags": [
      {{"finding": str, "source_agent": str, "priority": "urgent|high|medium"}}
    ],
    "medication_summary": str,
    "active_diagnoses": [str],
    "lab_highlights": [str],
    "treatment_context": str,
    "risk_summary": str
  }}
}}"""

        # Use Gemini 1.5 (More stable quota)
        import google.generativeai as genai
        import os
        import json
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # skip agents that were denied by consent or failed
        active_outputs = [o for o in agent_outputs
                          if o and not o.get("skipped") and "error" not in o]
        
        user_prompt = f"Agent outputs:\n{active_outputs}"
        
        try:
            response = model.generate_content([system, user_prompt])
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception as e:
            print(f"Synthesis LLM Error: {e}")
            return {"error": str(e)}
