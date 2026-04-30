import sqlite3
import json
import numpy as np
from sentence_transformers import SentenceTransformer

class VectorStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        # Initialize the embedder
        try:
            self.embedder = SentenceTransformer("nomic-ai/nomic-embed-text-v1")
        except Exception as e:
            print(f"Error loading SentenceTransformer: {e}")
            self.embedder = None
        
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS clinical_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT,
                content TEXT,
                embedding BLOB,
                metadata TEXT,
                content_hash TEXT,
                UNIQUE(patient_id, content_hash)
            )
        """)
        conn.commit()

    def _cosine_similarity(self, a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def search(self, patient_id: str, query: str, top_k: int = 5) -> list[dict]:
        if not self.embedder:
            return []
            
        query_vec = self.embedder.encode(query)
        
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT content, metadata, embedding FROM clinical_embeddings
            WHERE patient_id = ?
        """, (patient_id,))
        rows = cur.fetchall()
        
        results = []
        for content, metadata_str, embedding_blob in rows:
            vec = np.frombuffer(embedding_blob, dtype=np.float32)
            score = self._cosine_similarity(query_vec, vec)
            results.append({
                "content": content,
                "metadata": json.loads(metadata_str),
                "score": float(score)
            })
            
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def upsert(self, patient_id: str, text: str, metadata: dict):
        if not self.embedder:
            return
            
        vec = self.embedder.encode(text).astype(np.float32)
        content_hash = str(hash(text)) # Simple hash for demo
        
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO clinical_embeddings (patient_id, content, embedding, metadata, content_hash)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(patient_id, content_hash) DO UPDATE SET
                embedding = excluded.embedding,
                metadata = excluded.metadata
        """, (patient_id, text, vec.tobytes(), json.dumps(metadata), content_hash))
        conn.commit()
