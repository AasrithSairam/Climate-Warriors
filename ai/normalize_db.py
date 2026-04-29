import sqlite3
import datetime
import time

def to_ms(date_val):
    if isinstance(date_val, int):
        return date_val
    if not date_val:
        return None
    try:
        # Try parsing common formats
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ"
        ]
        for fmt in formats:
            try:
                dt = datetime.datetime.strptime(str(date_val), fmt)
                return int(dt.timestamp() * 1000)
            except ValueError:
                continue
        return date_val # Fallback
    except:
        return date_val

def normalize_db():
    conn = sqlite3.connect('backend/prisma/dev.db')
    cur = conn.cursor()
    
    # 1. MedicalRecord
    cur.execute("SELECT id, date FROM MedicalRecord")
    rows = cur.fetchall()
    for row in rows:
        ms = to_ms(row[1])
        cur.execute("UPDATE MedicalRecord SET date = ? WHERE id = ?", (ms, row[0]))
        
    # 2. TriageData
    cur.execute("SELECT id, createdAt FROM TriageData")
    rows = cur.fetchall()
    for row in rows:
        ms = to_ms(row[1])
        cur.execute("UPDATE TriageData SET createdAt = ? WHERE id = ?", (ms, row[0]))

    # 3. Appointment
    cur.execute("SELECT id, createdAt FROM Appointment")
    rows = cur.fetchall()
    for row in rows:
        ms = to_ms(row[1])
        cur.execute("UPDATE Appointment SET createdAt = ? WHERE id = ?", (ms, row[0]))

    # 4. User
    cur.execute("SELECT id, dob, createdAt FROM User")
    rows = cur.fetchall()
    for row in rows:
        dob_ms = to_ms(row[1])
        created_ms = to_ms(row[2])
        cur.execute("UPDATE User SET dob = ?, createdAt = ? WHERE id = ?", (dob_ms, created_ms, row[0]))

    conn.commit()
    print("Database normalization complete. All dates converted to milliseconds.")
    conn.close()

if __name__ == "__main__":
    normalize_db()
