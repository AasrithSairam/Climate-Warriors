import sqlite3
import pandas as pd
import os
import datetime

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "prisma", "dev.db")
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "RxHandBD A Handwritten Prescription Word Image Dat", "ML_extracted", "RxHandBD-ML")
TEST_CSV = os.path.join(DATASET_PATH, "Test_Label.csv")

def ingest_data():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    if not os.path.exists(TEST_CSV):
        print(f"Error: Dataset CSV not found at {TEST_CSV}")
        return

    # Load handwritten labels
    df = pd.read_csv(TEST_CSV)
    print(f"Loaded {len(df)} records from {TEST_CSV}")

    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Find the first patient
    cur.execute("SELECT id FROM User WHERE role = 'PATIENT' LIMIT 1")
    patient = cur.fetchone()
    if not patient:
        print("Error: No patients found in database.")
        return
    patient_id = patient[0]
    print(f"Ingesting into patient ID: {patient_id}")

    # 2. Ingest medications from the dataset
    # We take the first 50 for this demo
    count = 0
    for index, row in df.head(50).iterrows():
        med_name = row['Text']
        image_file = row['Images']
        
        # Check if it's a valid medication name (skip '???')
        if med_name == '???' or pd.isna(med_name):
            continue
            
        date = (datetime.datetime.now() - datetime.timedelta(days=index)).strftime('%Y-%m-%d %H:%M:%S')
        
        # Insert into MedicalRecord table
        # Structure from schema: id, patientId, hospitalId, title, type, specialty, content, date, documentUrl, createdAt, updatedAt
        # We'll use a mock hospital ID (find first hospital)
        cur.execute("SELECT id FROM Hospital LIMIT 1")
        hospital = cur.fetchone()
        hospital_id = hospital[0] if hospital else "mock-h-1"

        try:
            cur.execute("""
                INSERT INTO MedicalRecord (id, patientId, hospitalId, title, type, specialty, content, date, documentUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(index + 1000), # Mock ID
                patient_id, 
                hospital_id, 
                med_name, 
                'MEDICATION', 
                'Transcribed', 
                f"Extracted from handwritten prescription image: {image_file}", 
                date, 
                image_file
            ))
            count += 1
        except Exception as e:
            print(f"Error inserting row {index}: {e}")

    conn.commit()
    print(f"Successfully ingested {count} handwritten prescriptions for patient {patient_id}.")
    conn.close()

if __name__ == "__main__":
    ingest_data()
