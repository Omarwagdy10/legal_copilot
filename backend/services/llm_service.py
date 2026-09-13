import json
from providers.llm import get_llm_provider


def generate_ai_response(prompt: str) -> str:
    """
    Sends the prompt to the configured LLM provider
    and returns the generated text.
    """
    return get_llm_provider().complete(prompt)


def parse_json_response(text: str):
    """
    Converts the LLM response into a Python object.

    The model may return JSON inside markdown code fences,
    so we remove those fences before parsing.
    """

    if not text:
        raise ValueError("LLM returned an empty response.")

    value = text.strip()

    # Remove ```json ... ```
    if value.startswith("```json"):
        value = value[7:].strip()

    # Remove generic ``` ... ```
    elif value.startswith("```"):
        value = value[3:].strip()

    if value.endswith("```"):
        value = value[:-3].strip()

    try:
        return json.loads(value)

    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM returned invalid JSON: {exc.msg}"
        ) from exc


def generate_json_response(prompt: str):
    """
    Generates an AI response and parses it as JSON.
    """
    response = generate_ai_response(prompt)
    return parse_json_response(response)