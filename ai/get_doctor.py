import sqlite3
conn = sqlite3.connect('backend/prisma/dev.db')
cur = conn.cursor()
cur.execute("SELECT id FROM User WHERE role='DOCTOR' LIMIT 1")
print(cur.fetchone()[0])
conn.close()
