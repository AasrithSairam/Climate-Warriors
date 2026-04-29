import statistics
from .base_agent import BaseAgent
from memory.fhir_store import FHIRStore

class LabTrendAgent(BaseAgent):


    # LOINC codes for key labs
    KEY_LABS = {
        "creatinine":    "2160-0",
        "hba1c":         "4548-4",
        "haemoglobin":   "718-7",
        "sodium":        "2951-2",
        "potassium":     "2823-3",
        "wbc":           "6690-2",
        "alt":           "1742-6",
        "heartRate":     "8867-4",
        "spo2":          "2708-6",
        "sugar":         "2339-0",
        "bp":            "85354-9"
    }

    def __init__(self, patient_id, consent_scope, store: FHIRStore):
        super().__init__(patient_id, consent_scope)
        self.store = store

    def _compute_trend(self, values: list[float]) -> dict:
        if len(values) < 2:
            return {"direction": "insufficient_data", "delta": 0}
        delta = values[-1] - values[0]
        pct   = (delta / values[0]) * 100 if values[0] != 0 else 0
        mean  = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 2 else 0
        latest_z = ((values[-1] - mean) / stdev) if stdev > 0 else 0
        return {
            "direction":   "rising" if delta > 0 else "falling",
            "delta":       round(delta, 3),
            "pct_change":  round(pct, 1),
            "baseline_mean": round(mean, 3),
            "latest_z_score": round(latest_z, 2),  # deviation from own baseline
        }

    def run(self) -> dict:
        if not self._check_scope("labs"):
            return {"agent": "lab_trends", "skipped": True}

        lab_data = {}
        for name, loinc in self.KEY_LABS.items():
            obs = self.store.get_observations(self.patient_id, code=loinc)
            values = []
            dates  = []
            for o in obs:
                try:
                    # BP is a special case since it's a string "120/80"
                    if loinc == "85354-9":
                        # Just take the systolic for trend analysis
                        v = float(o["valueString"].split('/')[0])
                    else:
                        v = o["valueQuantity"]["value"]
                    d = o.get("effectiveDateTime", "unknown")
                    values.append(float(v))
                    dates.append(d)
                except (KeyError, TypeError, ValueError):
                    continue
            if values:
                lab_data[name] = {
                    "values": values,
                    "dates":  dates,
                    "unit":   obs[0].get("valueQuantity", {}).get("unit", ""),
                    "trend":  self._compute_trend(values),
                }

        system = """You are a clinical lab analysis AI.
Given longitudinal lab values with computed trends and z-scores,
identify clinically significant patterns. Return ONLY valid JSON:
{
  "anomalies": [
    {"lab": str, "finding": str, "severity": "low|medium|high",
     "z_score": float}
  ],
  "trends_of_concern": [
    {"lab": str, "trend": str, "clinical_note": str}
  ],
  "stable_labs": [str],
  "summary": str
}"""

        user = f"Lab trend data:\n{lab_data}"
        result = self._call_llm(system, user)
        result["agent"] = "lab_trends"
        result["raw_trends"] = lab_data   # preserve computed data
        return result
