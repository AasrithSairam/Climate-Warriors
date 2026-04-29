from .base_agent import BaseAgent
from memory.fhir_store import FHIRStore
from memory.vector_store import VectorStore

class TreatmentAgent(BaseAgent):
    model = "jsl-medllm:32b"

    def __init__(self, patient_id, consent_scope,
                 fhir: FHIRStore, vectors: VectorStore):
        super().__init__(patient_id, consent_scope)
        self.fhir    = fhir
        self.vectors = vectors

    def run(self) -> dict:
        if not self._check_scope("treatments"):
            return {"agent": "treatment", "skipped": True}

        procedures = self.fhir.get_procedures(self.patient_id)
        # semantic search for treatment outcome notes
        outcome_notes = self.vectors.search(
            self.patient_id,
            query="treatment outcome response efficacy side effects",
            top_k=8
        )

        system = """You are a clinical treatment analysis AI.
Analyse past procedures and outcome notes to extract treatment response
patterns. Return ONLY valid JSON:
{
  "procedures": [
    {"name": str, "date": str, "outcome": str}
  ],
  "effective_treatments": [
    {"treatment": str, "condition": str, "evidence": str}
  ],
  "ineffective_treatments": [
    {"treatment": str, "condition": str, "reason": str}
  ],
  "adverse_reactions": [
    {"drug_or_procedure": str, "reaction": str, "severity": str,
     "date": str}
  ],
  "response_patterns": [str],
  "summary": str
}"""

        user = (f"Procedures: {procedures}\n"
                f"Outcome notes: {outcome_notes}")
        result = self._call_llm(system, user)
        result["agent"] = "treatment"
        return result
