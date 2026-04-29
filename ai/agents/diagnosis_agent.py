from .base_agent import BaseAgent
from memory.fhir_store import FHIRStore
from memory.episode_graph import EpisodeGraph

class DiagnosisAgent(BaseAgent):
    model = "jsl-medllm:32b"

    # ICD-10 groups that cluster comorbidities
    COMORBIDITY_CLUSTERS = {
        "metabolic": ["E11", "E10", "E78", "E66"],   # DM, dyslipidemia, obesity
        "cardiovascular": ["I10", "I25", "I50", "I48"],
        "renal": ["N18", "N17", "N19"],
        "hepatic": ["K74", "K70", "K75"],
    }

    def __init__(self, patient_id, consent_scope,
                 store: FHIRStore, graph: EpisodeGraph):
        super().__init__(patient_id, consent_scope)
        self.store = store
        self.graph = graph

    def _detect_clusters(self, conditions: list[dict]) -> list[str]:
        found_clusters = []
        active_codes = []
        for c in conditions:
            try:
                code = c["code"]["coding"][0]["code"]
                active_codes.append(code)
            except (KeyError, IndexError):
                continue
        for cluster, prefixes in self.COMORBIDITY_CLUSTERS.items():
            hits = [c for c in active_codes
                    if any(c.startswith(p) for p in prefixes)]
            if len(hits) >= 2:
                found_clusters.append(cluster)
        return found_clusters

    def run(self) -> dict:
        if not self._check_scope("diagnoses"):
            return {"agent": "diagnosis", "skipped": True}

        conditions  = self.store.get_conditions(self.patient_id)
        episode_ctx = self.graph.get_episode_chain(self.patient_id)
        clusters    = self._detect_clusters(conditions)

        system = """You are a clinical diagnostics AI.
Given FHIR Condition resources, episode chains, and detected comorbidity
clusters, return ONLY valid JSON:
{
  "active_conditions": [
    {"name": str, "icd10": str, "onset": str, "status": str}
  ],
  "resolved_conditions": [
    {"name": str, "icd10": str, "resolved_date": str}
  ],
  "comorbidity_clusters": [str],
  "deduplication_notes": [str],
  "risk_from_diagnoses": [
    {"condition": str, "risk": str, "rationale": str}
  ],
  "summary": str
}"""

        user = (f"Conditions: {conditions}\n"
                f"Episode chain: {episode_ctx}\n"
                f"Detected clusters: {clusters}")
        result = self._call_llm(system, user)
        result["agent"] = "diagnosis"
        return result
