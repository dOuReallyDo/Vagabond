# Technical Architecture (MVP)

## Required
Embeddable frontend widget + server-side API proxy (mandatory) + Gemini LLM + grounding tools.

## Non-negotiables
- No API keys in the browser
- Input validation
- Rate limiting
- Logging
- Strict JSON schema output + runtime validation
- Dev/Staging/Prod separation

## Recommended (simple, production-ready)
- Frontend: Vite + React + TypeScript (build to static assets)
- Serverless: Vercel Functions under /api
- Optional rate limit: Upstash Redis
