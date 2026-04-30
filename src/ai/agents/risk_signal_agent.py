import numpy as np
import joblib
import os
from .base_agent import BaseAgent
from memory.fhir_store import FHIRStore

class RiskSignalAgent(BaseAgent):


    def __init__(self, patient_id, consent_scope, store: FHIRStore):
        super().__init__(patient_id, consent_scope)
        self.store = store
        # Logic to find models directory relative to this file
        self.models_path = os.path.join(os.path.dirname(__file__), "..", "models")
        self.readmission_model = self._load_model("readmission_30d.pkl")
        self.sepsis_model = self._load_model("sepsis_risk.pkl")

    def _load_model(self, filename):
        path = os.path.join(self.models_path, filename)
        if os.path.exists(path):
            try:
                return joblib.load(path)
            except:
                return None
        return None

    RISK_THRESHOLDS = {
        "readmission": {"medium": 0.25, "high": 0.50},
        "sepsis":      {"medium": 0.15, "high": 0.40},
    }

    def _extract_features(self) -> np.ndarray:
        """Build feature vector from FHIR data for ML models."""
        obs  = self.store.get_observations(self.patient_id)
        cond = self.store.get_conditions(self.patient_id)

        age          = 55 # placeholder
        num_conditions = len(cond)
        
        # pull specific vitals via LOINC
        temp  = self._latest_value(obs, "8310-5")   # body temp LOINC
        hr    = self._latest_value(obs, "8867-4")   # heart rate
        rr    = self._latest_value(obs, "9279-1")   # resp rate
        wbc   = self._latest_value(obs, "6690-2")   # WBC
        creat = self._latest_value(obs, "2160-0")   # creatinine
        return np.array([[age, num_conditions, temp, hr, rr, wbc, creat]])

    def _latest_value(self, obs: list, loinc: str) -> float:
        for o in obs:
            try:
                if o["code"]["coding"][0]["code"] == loinc:
                    if "valueQuantity" in o:
                        return float(o["valueQuantity"]["value"])
                    elif "valueString" in o and "/" in o["valueString"]:
                        return float(o["valueString"].split('/')[0])
            except (KeyError, TypeError, IndexError):
                continue
        return 0.0

    def _classify(self, score: float, model_name: str) -> str:
        t = self.RISK_THRESHOLDS[model_name]
        if score >= t["high"]:   return "high"
        if score >= t["medium"]: return "medium"
        return "low"

    def run(self) -> dict:
        if not self._check_scope("risk"):
            return {"agent": "risk_signals", "skipped": True}

        features = self._extract_features()
        
        # Scoring with fallbacks
        readmit_score = 0.1 # default
        if self.readmission_model:
            try:
                readmit_score = float(self.readmission_model.predict_proba(features)[0][1])
            except: pass
            
        sepsis_score = 0.05 # default
        if self.sepsis_model:
            try:
                sepsis_score = float(self.sepsis_model.predict_proba(features)[0][1])
            except: pass

        flags = []
        if self._classify(readmit_score, "readmission") != "low":
            flags.append({
                "type":  "readmission_risk",
                "score": round(readmit_score, 3),
                "level": self._classify(readmit_score, "readmission")
            })
        if self._classify(sepsis_score, "sepsis") != "low":
            flags.append({
                "type":  "sepsis_risk",
                "score": round(sepsis_score, 3),
                "level": self._classify(sepsis_score, "sepsis")
            })

        # LLM narrates the flags in clinical language
        system = """You are a clinical risk analyst AI.
Given computed risk scores, generate a concise clinical narrative.
Return ONLY valid JSON:
{
  "risk_flags": [...],
  "narrative": str,
  "recommended_actions": [str],
  "summary": str
}"""
        user = f"Computed risk flags: {flags}"
        result = self._call_llm(system, user)
        result["agent"]      = "risk_signals"
        result["risk_flags"] = flags
        return result
