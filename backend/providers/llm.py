from abc import ABC, abstractmethod
import httpx
import time

from google import genai
from core_config import settings


class QuotaExceededError(Exception):
    """Raised when Gemini quota or rate limit is exhausted."""
    pass


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str:
        ...


class GeminiProvider(LLMProvider):
    def __init__(self):
        self.client = genai.Client(
            api_key=settings.gemini_api_key
        )
        self.model = "gemini-3.6-flash"

    def _is_quota_error(self, exc: Exception) -> bool:
        status_code = getattr(exc, "status_code", None)
        code = getattr(exc, "code", None)

        error_text = str(exc).upper()

        return (
            status_code == 429
            or code == 429
            or "RESOURCE_EXHAUSTED" in error_text
            or "QUOTA" in error_text
            or "RATE LIMIT" in error_text
        )

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

                # لو المشكلة quota نروح للـ fallback مباشرة
                if self._is_quota_error(exc):
                    raise QuotaExceededError(
                        "Gemini quota or rate limit has been exceeded."
                    ) from exc

                # retry فقط للأخطاء المؤقتة الأخرى
                if attempt < 2:
                    time.sleep(2 ** attempt)

        raise RuntimeError(
            "Gemini is temporarily unavailable after 3 attempts."
        ) from last_error


class OllamaProvider(LLMProvider):
    def complete(self, prompt: str) -> str:
        payload = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
        }

        try:
            response = httpx.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
                timeout=120,
            )

            response.raise_for_status()

            result = response.json()

            answer = result.get("response", "").strip()

            if not answer:
                raise RuntimeError(
                    "Ollama returned an empty response."
                )

            return answer

        except httpx.RequestError as exc:
            raise RuntimeError(
                f"Ollama is not reachable at "
                f"{settings.ollama_base_url}"
            ) from exc


class FailoverLLMProvider(LLMProvider):
    """
    Gemini = Primary
    Ollama = Fallback
    """

    def __init__(self):
        self.gemini = GeminiProvider()
        self.ollama = OllamaProvider()

    def complete(self, prompt: str) -> str:

        try:
            print("[LLM] Trying Gemini...")
            return self.gemini.complete(prompt)

        except QuotaExceededError:
            print(
                "[LLM] Gemini quota exceeded. "
                "Switching to Ollama..."
            )

            return self.ollama.complete(prompt)


def get_llm_provider() -> LLMProvider:

    # لو عايز Ollama مباشرة من الإعدادات
    if settings.llm_provider == "ollama":
        return OllamaProvider()

    # الوضع الطبيعي:
    # Gemini أولاً -> Ollama عند quota
    return FailoverLLMProvider()