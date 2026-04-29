import json
from abc import ABC, abstractmethod
from ollama import Client

# Initialize Ollama client
# Note: Using the Client as per your implementation guide.
client = Client(host="http://localhost:11434")

class BaseAgent(ABC):
    model = "llama3.3:70b"   # swap to jsl-medllm for clinical agents in subclasses

    def __init__(self, patient_id: str, consent_scope: list[str]):
        self.patient_id = patient_id
        self.consent_scope = consent_scope  # e.g. ["medications", "labs"]

    def _check_scope(self, required_scope: str) -> bool:
        return required_scope in self.consent_scope

    def _call_llm(self, system: str, user: str) -> dict:
        try:
            response = client.chat(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user}
                ],
                format="json"       # forces structured JSON output
            )
            return json.loads(response["message"]["content"])
        except Exception as e:
            print(f"LLM Error in {self.__class__.__name__}: {e}")
            return {"error": str(e), "agent": self.__class__.__name__.lower()}

    @abstractmethod
    def run(self) -> dict:
        """Each agent implements its own run() and returns structured JSON."""
        pass
