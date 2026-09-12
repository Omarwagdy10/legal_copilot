# Project Status

This package is an MVP-focused completion of the uploaded Legal Copilot project.

Implemented: authentication, two server-side roles, bilingual Arabic/English retrieval support, PDF/TXT ingestion, clause-based indexing, ChromaDB vector storage, hybrid dense+keyword retrieval, refusal on low evidence, three review agents plus pipeline orchestrator, persisted review/risk/approval data, audit-friendly run/step traces, dynamic dashboard, human approval gate, provider abstraction (Gemini/Ollama), basic security controls, evaluation starter set (25 cases / 5 adversarial), migrations, Docker Compose, and core documentation.

Deferred deliberately: production streaming/cancellation, durable async worker queue, OpenTelemetry, production rate limiting, full 30-document/150-page corpus packaging, complete CI/PR/GitHub governance, and the full 15–25 slide teaching pack + two videos.

The backend source passes Python bytecode compilation in the build environment. Full runtime integration with MySQL/ChromaDB/Gemini and the React build was not executed in this environment because those runtime dependencies were not available/could not be installed offline. Run the documented setup commands locally before submission.
