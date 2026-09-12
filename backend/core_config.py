import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    database_url = os.getenv('DATABASE_URL')
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    jwt_secret_key = os.getenv('JWT_SECRET_KEY')
    access_token_expire_minutes = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
    llm_provider = os.getenv('LLM_PROVIDER', 'gemini').lower()
    ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    ollama_model = os.getenv('OLLAMA_MODEL', 'llama3.2')
    max_upload_mb = int(os.getenv('MAX_UPLOAD_MB', '10'))
    min_evidence_score = float(os.getenv('MIN_EVIDENCE_SCORE', '0.18'))

settings = Settings()

if not settings.database_url:
    raise RuntimeError('DATABASE_URL is not configured.')
if not settings.jwt_secret_key:
    raise RuntimeError('JWT_SECRET_KEY is not configured.')
