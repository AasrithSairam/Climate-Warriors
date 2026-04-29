from .base_agent import BaseAgent

class SynthesisAgent(BaseAgent):


    def __init__(self, patient_id, consent_scope, encounter_type: str):
        super().__init__(patient_id, consent_scope)
        self.encounter_type = encounter_type

    def run(self, agent_outputs: list[dict]) -> dict:
        system = f"""You are a clinical synthesis AI generating a
point-of-care brief for a clinician. The encounter type is: {self.encounter_type}.

Merge the outputs from all specialist agents. Deduplicate overlapping findings.
Rank information by clinical relevance to THIS encounter type.
Return ONLY valid JSON:
{{
  "clinical_brief": {{
    "critical_flags": [
      {{"finding": str, "source_agent": str, "priority": "urgent|high|medium"}}
    ],
    "medication_summary": str,
    "active_diagnoses": [str],
    "lab_highlights": [str],
    "treatment_context": str,
    "risk_summary": str
  }},
  "full_context": {{}},
  "data_sources": [str],
  "generated_at": str,
  "conflicts_resolved": [str]
}}"""

        # skip agents that were denied by consent or failed
        active_outputs = [o for o in agent_outputs
                          if o and not o.get("skipped") and "error" not in o]

        user = f"Agent outputs:\n{active_outputs}"
        return self._call_llm(system, user)
