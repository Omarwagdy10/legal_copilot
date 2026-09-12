from abc import ABC, abstractmethod
import httpx
import time
from google.genai import errors
from google import genai
from core_config import settings

class LLMProvider(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str: ...

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.client = genai.Client(
            api_key=settings.gemini_api_key
        )

        self.model = "gemini-3.6-flash"

    def complete(self, prompt: str) -> str:
        last_error = None

        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                )

                return (response.text or "").strip()

            except Exception as exc:
                last_error = exc

                if attempt < 2:
                    time.sleep(2 ** attempt)

        raise RuntimeError(
            "Gemini is temporarily unavailable after 3 attempts. "
            "Please try again later."
        ) from last_error
            
class OllamaProvider(LLMProvider):
    def complete(self, prompt: str) -> str:
        payload = {'model': settings.ollama_model, 'prompt': prompt, 'stream': False}
        response = httpx.post(f'{settings.ollama_base_url}/api/generate', json=payload, timeout=120)
        response.raise_for_status()
        return response.json().get('response', '').strip()

def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == 'ollama':
        return OllamaProvider()
    return GeminiProvider()
