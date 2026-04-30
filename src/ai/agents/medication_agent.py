from .base_agent import BaseAgent
from memory.fhir_store import FHIRStore

class MedicationAgent(BaseAgent):


    def __init__(self, patient_id, consent_scope, store: FHIRStore):
        super().__init__(patient_id, consent_scope)
        self.store = store

    def run(self) -> dict:
        if not self._check_scope("medications"):
            return {"agent": "medication", "skipped": True,
                    "reason": "consent_not_granted"}

        meds = self.store.get_medications(self.patient_id)

        system = """You are a clinical pharmacist AI.
Given a list of FHIR MedicationRequest resources, return ONLY valid JSON:
{
  "active_medications": [
    {"name": str, "dose": str, "frequency": str, "started": str}
  ],
  "stopped_medications": [
    {"name": str, "reason": str, "stopped_date": str}
  ],
  "interaction_flags": [
    {"drug_a": str, "drug_b": str, "severity": "mild|moderate|severe",
     "description": str}
  ],
  "adherence_signals": [
    {"medication": str, "signal": str, "confidence": "low|medium|high"}
  ],
  "summary": str
}"""

        user = f"Patient medications (FHIR JSON):\n{meds}"
        result = self._call_llm(system, user)
        result["agent"] = "medication"
        return result
