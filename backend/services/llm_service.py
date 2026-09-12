import json
from providers.llm import get_llm_provider

def generate_ai_response(prompt: str) -> str:
    return get_llm_provider().complete(prompt)

def parse_json_response(text: str):
    value = text.strip()
    if value.startswith('```json'):
        value = value[7:]
    if value.endswith('```'):
        value = value[:-3]
    return json.loads(value.strip())

def generate_json_response(prompt: str):
    return parse_json_response(generate_ai_response(prompt))
