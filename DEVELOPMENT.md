# Requisiti di Sviluppo - Vagabond AI

## Requisiti Minimi
- Node.js: **20.x**
- npm: 10+
- GEMINI_API_KEY valorizzata lato server

## Setup
1. `npm install`
2. Crea `.env`:
   ```env
   GEMINI_API_KEY=la_tua_chiave
   ```
3. Avvio dev: `npm run dev`

## Architettura aggiornata
- **Server-side first per AI**: il frontend non accede mai direttamente a Gemini.
- Endpoint:
  - `POST /api/generate`: genera il piano viaggio.
  - `POST /api/reviews`: sintetizza recensioni alloggi.
- Validazione forte:
  - Input: `TravelInputsSchema`.
  - Output: `TravelPlanSchema`.
- Hardening MVP:
  - Rate limiting in-memory per IP.
  - Logging strutturato con `requestId`.
  - Error mapping coerente (`INVALID_INPUT`, `UPSTREAM_ERROR`, ecc.).

## Qualità
- `npm run lint`: typecheck rapido (`tsc --noEmit`).
- `npm run build`: build completa frontend + typecheck.
