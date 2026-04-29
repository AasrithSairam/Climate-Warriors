import sqlite3
import json

class FHIRStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        print(f"FHIRStore initialized with DB path: {self.db_path}")

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_medications(self, patient_id: str) -> list[dict]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM MedicalRecord
            WHERE patientId = ? AND type = 'MEDICATION'
            ORDER BY date DESC
        """, (patient_id,))
        rows = cur.fetchall()
        return [
            {
                "resourceType": "MedicationRequest",
                "id": str(r["id"]),
                "status": "active",
                "intent": "order",
                "medicationCodeableConcept": {"text": r["title"]},
                "dosageInstruction": [{"text": r["content"]}],
                "authoredOn": r["date"]
            } for r in rows
        ]

    def get_observations(self, patient_id: str, code: str = None) -> list[dict]:
        conn = self._get_conn()
        cur = conn.cursor()
        
        # In our SQLite, observations come from TriageData
        # Mapping common LOINC codes to our TriageData columns for the agents
        LOINC_MAP = {
            "2160-0": "creatinine", # Mocked if missing
            "4548-4": "hba1c",      # Mocked if missing
            "8867-4": "heartRate",
            "2708-6": "spo2",
            "2339-0": "sugar",
            "85354-9": "bp"
        }

        cur.execute("""
            SELECT t.* FROM TriageData t
            JOIN Appointment a ON t.appointmentId = a.id
            WHERE a.patientId = ?
            ORDER BY t.createdAt DESC LIMIT 100
        """, (patient_id,))
        triage_rows = cur.fetchall()
        
        observations = []
        for t in triage_rows:
            # Heart Rate
            if t["heartRate"]:
                observations.append({
                    "resourceType": "Observation",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart Rate"}]},
                    "valueQuantity": {"value": t["heartRate"], "unit": "bpm"},
                    "effectiveDateTime": t["createdAt"]
                })
            # SpO2
            if t["spo2"]:
                observations.append({
                    "resourceType": "Observation",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "2708-6", "display": "SpO2"}]},
                    "valueQuantity": {"value": t["spo2"], "unit": "%"},
                    "effectiveDateTime": t["createdAt"]
                })
            # Blood Sugar
            if t["sugar"]:
                observations.append({
                    "resourceType": "Observation",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "2339-0", "display": "Glucose"}]},
                    "valueQuantity": {"value": t["sugar"], "unit": "mg/dL"},
                    "effectiveDateTime": t["createdAt"]
                })
            # BP (needs parsing since it's "120/80")
            if t["bp"]:
                observations.append({
                    "resourceType": "Observation",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "85354-9", "display": "Blood Pressure"}]},
                    "valueString": t["bp"],
                    "effectiveDateTime": t["createdAt"]
                })

        if code:
            return [o for o in observations if o["code"]["coding"][0]["code"] == code]
        return observations

    def get_conditions(self, patient_id: str) -> list[dict]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM MedicalRecord
            WHERE patientId = ? AND type = 'NOTE'
            ORDER BY date DESC
        """, (patient_id,))
        rows = cur.fetchall()
        return [
            {
                "resourceType": "Condition",
                "id": str(r["id"]),
                "clinicalStatus": "active",
                "code": {"coding": [{"code": "ICD-10-MOCK"}], "text": r["title"]},
                "note": [{"text": r["content"]}],
                "recordedDate": r["date"]
            } for r in rows
        ]

    def get_procedures(self, patient_id: str) -> list[dict]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM MedicalRecord
            WHERE patientId = ? AND type = 'SCAN'
            ORDER BY date DESC
        """, (patient_id,))
        rows = cur.fetchall()
        return [
            {
                "resourceType": "Procedure",
                "id": str(r["id"]),
                "status": "completed",
                "code": {"text": r["title"]},
                "performedDateTime": r["date"],
                "note": [{"text": r["content"]}]
            } for r in rows
        ]

    def get_patient_profile(self, patient_id: str) -> dict:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT * FROM User WHERE id = ?", (patient_id,))
        row = cur.fetchone()
        return dict(row) if row else {}
