import sqlite3
conn = sqlite3.connect('backend/prisma/dev.db')
cur = conn.cursor()
DOCTOR_ID = "15406309-2c41-455f-b353-4ea2dafb9f7b"

# Fix Appointments
cur.execute("UPDATE Appointment SET doctorId = ? WHERE doctorId = 'mock-doctor-id'", (DOCTOR_ID,))

# Fix MedicalRecords (if any used mock-doctor-id)
# Wait, MedicalRecord doesn't have doctorId directly, it has appointmentId which links to doctorId.

conn.commit()
print("Database fixed. Appointments now link to a valid doctor.")
conn.close()
