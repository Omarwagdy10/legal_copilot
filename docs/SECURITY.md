# Security
- JWT authentication with expiry.
- Role checks server-side.
- Upload extension allow-list and size limit.
- `os.path.basename` prevents simple path traversal through filenames.
- Parameterized SQL through SQLAlchemy.
- Prompt grounding: model instructed to use only retrieved context.
- Approval action is server-side role protected and audited with user id/comment.
- Secrets kept in environment variables; never commit `.env`.

Known gaps: rate limiting, secret scanning CI, advanced prompt-injection suite, PII redaction, security headers.
