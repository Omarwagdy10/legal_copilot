# Architecture

## Layers
API → application/orchestration → agents/services → providers/storage.

## Agent pipeline
Orchestrator → Clause Extractor → Risk Assessor → Memo Drafter.

## Trust boundary
Retrieved document text is untrusted content and is inserted into prompts as context only. Approval is a separate server-side action protected by role.

## ADR index
1. ADR-001: clause-based chunking
2. ADR-002: hybrid retrieval
3. ADR-003: pipeline orchestration
4. ADR-004: ChromaDB choice
5. ADR-005: bilingual multilingual embeddings
