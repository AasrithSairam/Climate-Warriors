import sqlite3
import os
import datetime

# Configuration
DB_PATH = r"c:\Climate-Warriors\backend\prisma\dev.db"

def ingest_real_data():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Find patient John Doe
    cur.execute("SELECT id FROM User WHERE name = 'John Doe' LIMIT 1")
    patient = cur.fetchone()
    if not patient:
        print("John Doe not found.")
        return
    patient_id = patient[0]

    # Find a hospital
    cur.execute("SELECT id FROM Hospital LIMIT 1")
    hospital = cur.fetchone()
    hospital_id = hospital[0] if hospital else "mock-h-1"

    # Data from image.png (Laxmi Clinic)
    now_ms = 1712880000000 # Mock date in ms
    prescriptions = [
        {"title": "Tab. Zady 500mg", "content": "Antibiotic prescribed at Laxmi Clinic. One tablet daily for 3 days.", "date": now_ms},
        {"title": "Tab. Zerodol-P", "content": "Pain relief (Aceclofenac + Paracetamol). Twice daily after food.", "date": now_ms},
        {"title": "Tab. Rantip 150mg", "content": "Antacid (Ranitidine). Twice daily before food.", "date": now_ms},
        {"title": "Tab. L-Montus", "content": "Antihistamine for cold/fever.", "date": now_ms}
    ]

    # Vitals from image.png
    vitals = {
        "heartRate": 100,
        "spo2": 99,
        "bp": "130/80",
        "weight": 55.0,
        "chiefComplaint": "Cold and fever with headache. Throat tenderness."
    }

    # 1. Ingest Medications
    for p in prescriptions:
        cur.execute("""
            INSERT INTO MedicalRecord (id, patientId, hospitalId, title, type, specialty, content, date, documentUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"real-med-{os.urandom(4).hex()}",
            patient_id,
            hospital_id,
            p["title"],
            'MEDICATION',
            'General Physician',
            p["content"],
            p["date"],
            'test/image.png'
        ))

    # 2. Ingest Triage/Vitals (needs an appointment)
    cur.execute("""
        INSERT OR IGNORE INTO Appointment (id, patientId, doctorId, hospitalId, status, appointmentDate, timeSlot, issueString, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "real-appt-1",
        patient_id,
        "mock-doctor-id",
        hospital_id,
        "COMPLETED",
        "2026-03-12",
        "10:00 AM",
        vitals["chiefComplaint"],
        now_ms
    ))

    cur.execute("""
        INSERT OR IGNORE INTO TriageData (id, appointmentId, heartRate, spo2, bp, sugar, weight, chiefComplaint, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "real-triage-1",
        "real-appt-1",
        vitals["heartRate"],
        vitals["spo2"],
        vitals["bp"],
        110, # mock sugar
        vitals["weight"],
        vitals["chiefComplaint"],
        now_ms
    ))

    # Data from image copy 2.png (John Smith)
    prescriptions_2 = [
        {"title": "Betaloc 100mg", "content": "1 tab BID (Twice daily). Prescribed at Medical Centre.", "date": now_ms},
        {"title": "Dorzolamidum 10mg", "content": "1 tab BID (Twice daily).", "date": now_ms},
        {"title": "Cimetidine 50mg", "content": "2 tabs TID (Three times daily).", "date": now_ms},
        {"title": "Oxprelol 50mg", "content": "1 tab QD (Once daily).", "date": now_ms}
    ]

    for p in prescriptions_2:
        cur.execute("""
            INSERT INTO MedicalRecord (id, patientId, hospitalId, title, type, specialty, content, date, documentUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"real-med-smith-{os.urandom(4).hex()}",
            patient_id,
            hospital_id,
            p["title"],
            'MEDICATION',
            'Cardiology',
            p["content"],
            p["date"],
            'test/image copy 2.png'
        ))

    conn.commit()
    print("Successfully ingested all real-world prescriptions from the test folder!")
    conn.close()

if __name__ == "__main__":
    ingest_real_data()
