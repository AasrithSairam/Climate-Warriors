import os
import json
from orchestrator.orchestrator import Orchestrator
from agents.medication_agent import MedicationAgent
from agents.lab_trend_agent   import LabTrendAgent
from agents.diagnosis_agent   import DiagnosisAgent
from agents.treatment_agent   import TreatmentAgent
from agents.risk_signal_agent import RiskSignalAgent

# Configuration
DB_PATH = r"c:\Climate-Warriors\backend\prisma\dev.db"
PATIENT_ID = "f37398f3-757d-4096-9f6c-25ba78ba996a" # John Doe
SCOPE = ["medications", "labs", "diagnoses", "treatments", "risk"]

def test_all_agents():
    print(f"--- Starting Clinical Agent Validation for Patient: {PATIENT_ID} ---")
    
    orch = Orchestrator(DB_PATH)
    
    # 1. Medication Agent
    print("\n[1/5] Testing MedicationAgent...")
    med_agent = MedicationAgent(PATIENT_ID, SCOPE, orch.fhir)
    print(json.dumps(med_agent.run(), indent=2))
    
    # 2. Lab Trend Agent
    print("\n[2/5] Testing LabTrendAgent...")
    lab_agent = LabTrendAgent(PATIENT_ID, SCOPE, orch.fhir)
    print(json.dumps(lab_agent.run(), indent=2))
    
    # 3. Diagnosis Agent
    print("\n[3/5] Testing DiagnosisAgent...")
    diag_agent = DiagnosisAgent(PATIENT_ID, SCOPE, orch.fhir, orch.graph)
    print(json.dumps(diag_agent.run(), indent=2))
    
    # 4. Treatment Agent
    print("\n[4/5] Testing TreatmentAgent...")
    treat_agent = TreatmentAgent(PATIENT_ID, SCOPE, orch.fhir, orch.vectors)
    print(json.dumps(treat_agent.run(), indent=2))
    
    # 5. Risk Signal Agent
    print("\n[5/5] Testing RiskSignalAgent...")
    risk_agent = RiskSignalAgent(PATIENT_ID, SCOPE, orch.fhir)
    print(json.dumps(risk_agent.run(), indent=2))

    print("\n--- Validation Complete ---")

if __name__ == "__main__":
    test_all_agents()
