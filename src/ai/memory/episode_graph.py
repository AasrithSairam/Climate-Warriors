import sqlite3
import json

class EpisodeGraph:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_episode_chain(self, patient_id: str) -> list[dict]:
        """
        Retrieves a chain of clinical episodes. 
        In our simplified SQLite, we correlate MedicalRecord notes and Scans by date.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute("""
            SELECT type, title, date FROM MedicalRecord
            WHERE patientId = ?
            ORDER BY date ASC
        """, (patient_id,))
        rows = cur.fetchall()
        
        # Simple chronological chain
        chain = []
        for r in rows:
            chain.append({
                "event": r["title"],
                "type": r["type"],
                "timestamp": r["date"]
            })
        return chain
