# Legal Copilot — D1 / T1 MVP

A bilingual (Arabic + English) legal contract review copilot built with **FastAPI, MySQL, ChromaDB, multilingual embeddings, React/Vite, and configurable LLM providers**.

The system is designed to help a legal reviewer search contract evidence, analyze clauses, detect risks and deviations, and prepare a risk memo while keeping **Counsel in the approval loop**.

> **Important:** This README describes the current implemented MVP honestly. Features listed under **Future Features / Remaining Gaps** are not claimed as implemented.

---

## 1. What the project does

The main workflow is:

```text
Upload Contract
      ↓
Extract & Clean Text
      ↓
Extract Clauses
      ↓
Create Embeddings + Index in ChromaDB
      ↓
Hybrid Retrieval (Dense + Keyword)
      ↓
Ask Questions / Review Contract
      ↓
3 Specialized Agents
      ├── Clause Extractor
      ├── Risk Assessor
      └── Memo Drafter
      ↓
Risk Memo
      ↓
Counsel Approval
```

The project follows the legal variant workflow from the task: **upload contract → segment clauses → compare/analyze → identify deviations/risks → draft risk memo → Counsel approval**.

---

# 2. Implemented Features ✅

## Document ingestion

- Upload **PDF** and **TXT** documents.
- File size validation through configuration.
- Safe stored filenames to avoid overwriting an existing uploaded file.
- PDF text extraction using `pypdf`.
- Basic text cleaning before analysis.
- Document status is stored in MySQL.

## Document indexing

- Contract text is processed into searchable chunks.
- Each chunk is embedded using the multilingual model:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

- Embeddings are stored in **ChromaDB**.
- Chunk metadata includes information such as filename, chunk index, section/language metadata.
- Re-indexing/search is separated from the relational application data.

## RAG / Retrieval ✅

The project uses **hybrid retrieval** instead of relying on one search method only:

```text
Dense Semantic Search
        +
Keyword Search
        ↓
Fusion Score
        ↓
Top Relevant Chunks
```

The dense part helps with **meaning/similarity**, while the keyword part helps preserve important exact legal terms.

The retrieval service also supports language metadata filtering when a language filter is explicitly requested.

## Grounded Question Answering ✅

The `/ask` flow:

```text
User Question
   ↓
Hybrid Search
   ↓
Relevant Context
   ↓
LLM
   ↓
Answer + Sources
```

The prompt instructs the model to answer only from the supplied context. When evidence is not sufficient, the system can refuse instead of inventing information.

## Contract Deviation Analysis ✅

Deviation analysis is implemented as a workflow/endpoint, **not as a separate agent**.

Flow:

```text
Contract
   ↓
Clause Extractor
   ↓
Find Matching Playbook Rule
   ↓
Compare Clause vs Rule
   ↓
Deviation Result
```

The project uses a versioned `playbook.json` plus an external prompt file for the deviation analysis.

> **There is no `Deviation Agent` in the current backend.**

## Multi-Agent Contract Review ✅

The project has **3 specialized agents + 1 orchestrator**:

### 1. Clause Extractor
Extracts the main clauses from the contract without rewriting their content.

### 2. Risk Assessor
Analyzes extracted clauses and returns:

- risk level
- reason
- evidence

### 3. Memo Drafter
Takes the risk assessments and generates the final risk memo.

### Orchestrator
`LegalReviewOrchestrator` coordinates the agents using a **pipeline** pattern:

```text
Clause Extractor
      ↓
Risk Assessor
      ↓
Memo Drafter
```

The orchestrator currently includes retry/backoff and per-agent timeout controls.

> **There is no `Review Agent` in the current backend.** The review workflow is coordinated by the `LegalReviewOrchestrator`.

## Graceful degradation ✅

When the multi-agent workflow cannot complete because the LLM is unavailable, the review flow can fall back to a simpler **plain RAG** path instead of treating the whole application as unavailable.

This is especially useful when the hosted LLM reaches a free-tier/quota limitation.

## Human approval gate ✅

The system keeps a human in the loop for consequential actions.

Roles:

```text
Reviewer
   ↓
Can upload/index/search/review/deviation

Counsel
   ↓
All Reviewer permissions
   +
Approve / Reject
```

Approval is enforced on the server side using role checks.

## Authentication & authorization ✅

- JWT-based authentication.
- Passwords are stored as bcrypt hashes.
- Server-side role enforcement.
- Different permissions for `reviewer` and `counsel`.

## Run trace / observability basics ✅

Each review run can have:

- `run_id`
- `correlation_id`
- workflow status
- step records
- agent name per step
- step status/details

The run can be inspected through the runs API.

## Database layer ✅

### MySQL
Used for structured application data such as:

- users
- documents
- reviews
- risk assessments
- approvals
- run traces
- run steps

### ChromaDB
Used for vector/semantic retrieval of document chunks.

## Migrations ✅

Database schema changes are managed with **Alembic**.

Example:

```bash
alembic upgrade head
```

## Provider abstraction ✅

The LLM integration is separated behind a provider interface.

Conceptually:

```text
Business Logic
      ↓
   LLM Provider
      ↓
 ┌─────────────┐
 │             │
Gemini      Ollama
```

The main application therefore does not need to call the Gemini SDK directly from every business function.

- Gemini provider: implemented and used in the current demo.
- Ollama provider: adapter is present for an alternative/local provider, but it is not the current demo provider.

## Externalized prompts ✅

Prompts are stored as versioned files instead of being embedded as large strings inside business logic:

```text
backend/prompts/
├── clause_extraction.txt
├── deviation.txt
├── risk_assessment.txt
└── risk_memo.txt
```

## Bilingual UI / Arabic support ✅

- Arabic and English UI translations.
- RTL support for Arabic.
- Multilingual embedding model.
- Language metadata is kept with indexed chunks.
- Playbook contains Arabic/English clause aliases.

---

# 3. Current API / Backend Capabilities ✅

The current backend exposes functionality for:

- health check
- login/authentication
- document upload
- document listing
- document indexing
- document search
- grounded question answering
- clause extraction
- deviation analysis
- contract review
- run trace inspection
- pending approvals / risk issues
- Counsel approval/rejection
- document deletion

FastAPI also exposes the interactive API documentation through `/docs`.

---

# 4. Evaluation status 🟡

A lightweight evaluation starter exists, including bilingual retrieval checks and a golden-set/evaluation structure.

Current evaluation work is **not yet the final task-complete benchmark**.

What is still needed for final submission:

- a full golden set of **at least 25 Q/A pairs**
- at least **5 adversarial cases**
- retrieval hit-rate reporting
- groundedness reporting
- refusal correctness reporting
- actual measured baseline numbers and failure analysis
- a stronger English corpus for meaningful English and cross-lingual evaluation

The current corpus is mainly Arabic, so a failed English retrieval score should not be interpreted as proof that the embedding model is broken; the English corpus/evaluation coverage is still incomplete.

---

# 5. Security status 🟡

Implemented/started:

- JWT authentication
- role-based server-side authorization
- validated PDF/TXT uploads
- file size limits
- parameterized database access through SQLAlchemy
- approval gate for Counsel actions
- separation of retrieved content from system instructions in RAG prompts

Still needed for a stronger final security submission:

- production-grade rate limiting / abuse controls
- dependency scanning in CI
- stronger security headers/configuration review
- broader PII handling/redaction
- a larger prompt-injection evaluation set
- security logging/audit hardening

---

# 6. Future Features / Remaining Gaps 🚧

The following features are intentionally **not claimed as implemented yet**.

## Real-time streaming

Future work:

- token-level SSE/WebSocket streaming
- live agent progress events
- real server-side cancellation

## Persistent session history

Future work:

- conversation/session storage
- history per user
- resume previous Copilot sessions

## Full LLM cost/token observability

Future work:

- token usage per request
- estimated cost per request
- persisted cost/token metrics
- searchable LLM trace data

## Full OpenTelemetry / production tracing

The project currently has custom run/correlation tracing. Full distributed tracing is a future enhancement.

## Full approval workflow

Current support:

- approve
- reject

Future enhancement:

- **edit-and-approve** with complete audit history.

## Larger evaluation corpus

Future work:

- reach the required **30-document / 150+ page** corpus floor
- add more English documents
- improve cross-lingual evaluation
- expand adversarial/prompt-injection cases

## Production-grade rate limiting

Current MVP has basic payload/file constraints. Production-ready rate limiting and abuse protection are future work.

## Full async/background job architecture

Future work:

- background workers for long-running document/review jobs
- queued execution
- stronger isolation of long LLM operations

## Testing expansion

Current repository contains initial tests.

Future work:

- broader unit test coverage
- integration tests for ingestion/retrieval
- contract tests for agent/tool schemas
- more failure-path tests

## Teaching pack completion

A basic teaching directory exists, but the full instructor deliverable is still future work:

- 15–25 session slides
- complete hands-on lab
- expected outputs
- stretch challenges
- answer key
- learning-outcomes/assessment map
- common trainee mistakes sheet

## Production deployment

A Docker Compose setup exists for local/containerized execution.

Future work:

- stable public deployment
- production database/vector infrastructure
- secrets management
- CI/CD deployment pipeline
- monitoring

---

# 7. Quick Start

## Backend

```bash
cd backend

# create/activate your Python virtual environment

pip install -r requirements.txt

alembic upgrade head
python seed_users.py
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Frontend

From the project root:

```bash
npm install
npm run dev
```

Login users seeded by the project:

```text
reviewer1 / 123456
counsel1  / 123456
```

> Change demo credentials before any non-local use.

---

# 8. Docker

A Docker Compose configuration is included.

Typical local command:

```bash
docker compose up --build
```

Required secrets/configuration must be supplied through environment variables. Never commit the real `.env` file or API keys.

---

# 9. Project Structure

```text
legal_copilot/
├── backend/
│   ├── agents/
│   │   ├── legal_agents.py
│   │   └── tools.py
│   ├── evaluation/
│   ├── prompts/
│   ├── providers/
│   ├── services/
│   ├── tests/
│   ├── alembic/
│   ├── main.py
│   ├── models.py
│   └── playbook.json
│
├── src/
│   ├── pages/
│   ├── components/
│   ├── context/
│   └── App.jsx
│
├── docs/
├── teaching/
├── docker-compose.yml
└── README.md
```

---

# 10. Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend UI |
| Vite | Frontend dev/build tooling |
| FastAPI | Backend REST API |
| Python | Backend + AI integration |
| MySQL | Structured relational data |
| SQLAlchemy | ORM/database access |
| Alembic | Database migrations |
| ChromaDB | Vector storage and semantic retrieval |
| SentenceTransformers | Multilingual embeddings |
| Gemini | LLM generation / analysis |
| Ollama adapter | Alternative/local LLM provider path |
| JWT | Authentication |
| bcrypt | Password hashing |
| Docker Compose | Local/container orchestration |

---

# 11. Important Current Limitations

This is an **MVP**, not a production legal decision system.

The LLM is an assistant and can fail or become unavailable. For example, hosted Gemini free-tier quota can be exhausted. The application therefore includes retry handling and a fallback path, but this does not remove the need for human review.

The system should not be used as a substitute for legal counsel or as the sole basis for consequential legal decisions.

---

# 12. Development Notes

When adding features, keep the architecture boundaries clear:

```text
Frontend
   ↓
FastAPI/API layer
   ↓
Application/Business logic
   ↓
Provider / Retrieval adapters
   ↓
External systems
```

The goal is to keep LLM/vendor-specific code replaceable without rewriting the core legal workflow.

