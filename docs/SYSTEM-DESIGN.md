# System Design

## Target architecture
Gateway/auth → API → orchestration → agents → provider/vector store/relational store.

## Implemented MVP
FastAPI API, MySQL via SQLAlchemy/Alembic, ChromaDB, multilingual SentenceTransformer, provider abstraction (Gemini/Ollama), React UI.

## Gap table
| Target | Implemented? | Interim mitigation |
|---|---|---|
| Managed gateway/rate limiting | No | CORS + upload size cap |
| Broker/async workers | No | synchronous pipeline |
| Managed vector DB | No | ChromaDB persistent local |
| OpenTelemetry | No | custom Run/RunStep trace |
| Streaming/cancellation | No | synchronous responses |
| Corpus 30 docs/150+ pages | Partial | seed corpus script / use synthetic data |
