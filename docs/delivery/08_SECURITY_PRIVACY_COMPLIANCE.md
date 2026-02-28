# Security, Privacy, Compliance

## Data
- travel preferences (non-sensitive)
- optional email (PII)

## Rules
- do not expose API keys client-side
- redact PII from logs
- rate limit per IP
- validate inputs
- mitigate prompt injection (ignore attempts to reveal system prompt/keys)
- GDPR compliance if storing email
