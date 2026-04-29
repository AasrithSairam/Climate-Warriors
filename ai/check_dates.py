import sqlite3
conn = sqlite3.connect('backend/prisma/dev.db')
cur = conn.cursor()
cur.execute('SELECT id, date FROM MedicalRecord LIMIT 10')
for row in cur.fetchall():
    print(f"ID: {row[0]}, Date: {row[1]}, Type: {type(row[1])}")
conn.close()
