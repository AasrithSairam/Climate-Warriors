import sqlite3
import uuid
import time
import datetime

DB_PATH = r"c:\Climate-Warriors\backend\prisma\dev.db"

def to_ms(year, month, day):
    dt = datetime.datetime(year, month, day)
    return int(dt.timestamp() * 1000)

def seed_history():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Find John Doe
    cur.execute("SELECT id FROM User WHERE name = 'John Doe' LIMIT 1")
    patient_id = cur.fetchone()[0]

    # Find a hospital
    cur.execute("SELECT id FROM Hospital LIMIT 1")
    hospital_id = cur.fetchone()[0]

    historical_records = [
        {
            "title": "Annual Health Screening - 2023",
            "content": "Patient presented for routine checkup. Baseline BP 128/82. Lungs clear. Recommended increasing daily activity.",
            "type": "NOTE",
            "specialty": "Internal Medicine",
            "date": to_ms(2023, 4, 15)
        },
        {
            "title": "Influenza Vaccination",
            "content": "Annual flu shot administered. No immediate adverse reactions noted.",
            "type": "VACCINE",
            "specialty": "Preventive Care",
            "date": to_ms(2023, 11, 20)
        },
        {
            "title": "Acute Bronchitis Episode",
            "content": "Patient reported persistent cough and chest congestion. Prescribed Albuterol inhaler and rest. Symptoms resolved in 10 days.",
            "type": "NOTE",
            "specialty": "Pulmonology",
            "date": to_ms(2024, 2, 5)
        },
        {
            "title": "Cardiology Consultation - Baseline",
            "content": "Referred due to family history of hypertension. ECG shows normal sinus rhythm. Advised low sodium diet.",
            "type": "NOTE",
            "specialty": "Cardiology",
            "date": to_ms(2024, 8, 12)
        },
        {
            "title": "Lipid Profile Panel",
            "content": "Total Cholesterol: 195 mg/dL. LDL: 110 mg/dL. HDL: 55 mg/dL. Trigs: 150 mg/dL. Results within normal limits.",
            "type": "LAB",
            "specialty": "Diagnostics",
            "date": to_ms(2025, 1, 10)
        }
    ]

    for r in historical_records:
        cur.execute("""
            INSERT INTO MedicalRecord (id, patientId, hospitalId, title, type, specialty, content, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()),
            patient_id,
            hospital_id,
            r["title"],
            r["type"],
            r["specialty"],
            r["content"],
            r["date"]
        ))

    conn.commit()
    print("Historical clinical history successfully seeded for John Doe!")
    conn.close()

if __name__ == "__main__":
    seed_history()
