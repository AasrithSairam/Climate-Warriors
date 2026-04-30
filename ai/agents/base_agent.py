import json
import os
from abc import ABC, abstractmethod
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Determine provider based on key prefix
api_key = os.getenv("GROQ_API_KEY")
base_url = "https://api.groq.com/openai/v1"
model_name = "llama-3.3-70b-versatile"
vision_model_name = "llama-3.2-11b-vision-preview"

if api_key and api_key.startswith("xai-"):
    base_url = "https://api.x.ai/v1"
    model_name = "grok-beta"
    vision_model_name = "grok-vision-beta"

# Initialize client
client = OpenAI(api_key=api_key, base_url=base_url)

class BaseAgent(ABC):
    model = model_name
    vision_model = vision_model_name

    def __init__(self, patient_id: str, consent_scope: list[str], fhir_store=None):
        self.patient_id = patient_id
        self.consent_scope = consent_scope  # e.g. ["medications", "labs"]
        self.fhir = fhir_store

    def _check_scope(self, required_scope: str) -> bool:
        return required_scope in self.consent_scope

    def _call_llm(self, system: str, user: str) -> dict:
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"LLM Error in {self.__class__.__name__}: {e}")
            return {"error": str(e), "agent": self.__class__.__name__.lower()}

    @abstractmethod
    def run(self) -> dict:
        """Each agent implements its own run() and returns structured JSON."""
        pass
