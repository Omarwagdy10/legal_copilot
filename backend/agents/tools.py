import json
from services.llm_service import generate_json_response, generate_ai_response
from pathlib import Path

PROMPTS = Path(__file__).resolve().parent.parent / "prompts"

def extract_clauses_tool(text):
    prompt=(PROMPTS/"clause_extraction.txt").read_text(encoding="utf-8")+"\nContract:\n"+text
    return generate_json_response(prompt)

def assess_risks_tool(clauses):
    prompt=(PROMPTS/"risk_assessment.txt").read_text(encoding="utf-8")+"\nClauses:\n"+json.dumps(clauses,ensure_ascii=False)
    return generate_json_response(prompt)

def draft_memo_tool(risks):
    prompt=(PROMPTS/"risk_memo.txt").read_text(encoding="utf-8")+"\nRisk Assessments:\n"+json.dumps(risks,ensure_ascii=False)
    return generate_ai_response(prompt)

def retrieve_tool(rag_search, query, top_k=5):
    return rag_search(query, top_k=top_k)
