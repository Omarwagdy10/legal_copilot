# Legal Copilot — D1 / T1 MVP

A bilingual (Arabic + English) legal contract review copilot built with FastAPI, MySQL, ChromaDB, multilingual embeddings, React, and configurable LLM providers.

## Core workflow
Upload PDF/TXT → extract clauses → index → hybrid retrieve → review with 3 agents → risk memo → Counsel approval.

## Roles
- Reviewer: upload, index, ask, run review, deviation analysis.
- Counsel: everything a Reviewer can do + approve/reject.

## Quick start
1. Create MySQL database `legal_copilot`.
2. Copy `backend/.env.example` to `backend/.env` and set secrets/API key.
3. Backend: `cd backend`, install requirements, run `alembic upgrade head`, `python seed_users.py`, `uvicorn main:app --reload`.
4. Frontend: install npm dependencies, then `npm run dev`.
5. Login with `reviewer1/123456` or `counsel1/123456`.

## Docker
Set `GEMINI_API_KEY` in the shell and run `docker compose up --build`.

## Bilingual twist
The embedding model is multilingual; chunks keep a language metadata field; the UI supports RTL for Arabic questions/answers; the playbook includes Arabic and English aliases. A full quantitative Arabic-vs-English benchmark is provided as a lightweight evaluation starter and should be expanded for final submission.

## Deliberate scope cuts
Streaming/cancellation, full async workers, OpenTelemetry, production rate limiting, 30-doc/150-page corpus, and a full teaching pack are documented as deferred MVP gaps. Do not claim them as implemented.
