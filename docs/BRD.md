# BRD — Legal Copilot MVP

## Personas
- Reviewer
- Counsel

## Objective
Reduce contract review time while preserving grounded evidence and mandatory human approval.

## Business rules
- AI may only answer from retrieved contract evidence.
- Approval is server-side restricted to Counsel.
- Review results are persisted.
- No real personal data.

## Requirements traceability
- BR-01 Upload/index contract — implemented
- BR-02 Ask with citations — implemented (hybrid MVP)
- BR-03 Clause deviation against playbook — implemented
- BR-04 Risk memo — implemented
- BR-05 Human approval — implemented
- BR-06 Bilingual AR/EN — partial: multilingual embeddings + UI RTL + bilingual playbook; quantitative benchmark partial
- BR-07 Observable review run — implemented via Run/RunStep tables
- BR-08 Full streaming/async — deferred
