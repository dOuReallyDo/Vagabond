# Security Notes

## Stato attuale
- Le chiavi API Gemini restano lato server.
- Il frontend comunica solo con API interne (`/api/generate`, `/api/reviews`).
- È attivo rate limiting in-memory per IP.
- Input/output AI sono validati con schema Zod.

## Rischi residui
- Rate limiting in-memory non è distribuito (non adatto a multi-instance).
- Manca ancora autenticazione/abuse prevention avanzata.

## Miglioramenti consigliati (fase successiva)
- Passare a rate limiting distribuito (Redis/Upstash).
- Aggiungere audit log persistente + alerting.
- Aggiungere policy CSP e hardening headers.
- Test di sicurezza automatici in CI.
