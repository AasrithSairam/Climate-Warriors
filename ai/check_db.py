import sqlite3
import os

DB_PATH = r"c:\Climate-Warriors\backend\prisma\dev.db"
if os.path.exists(DB_PATH):
    print(f"Database exists at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", cur.fetchall())
    conn.close()
else:
    print(f"Database NOT found at {DB_PATH}")
