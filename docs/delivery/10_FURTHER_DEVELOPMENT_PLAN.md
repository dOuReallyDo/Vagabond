# Further Development Plan (post-hardening)

## Fase 1 — Affidabilità operativa (1-2 settimane)
1. Rate limiting distribuito (Upstash Redis)
2. Retry policy con backoff per chiamate Gemini
3. Caching risposte AI (chiave hash input)
4. Dashboard errori/latency con metriche minime

## Fase 2 — Qualità codice (1 settimana)
1. Reintrodurre ESLint completo con parser TypeScript in CI
2. Aggiungere unit test su utility + contract tests API
3. Aggiungere smoke test end-to-end su `/api/generate`

## Fase 3 — Evoluzione prodotto (2+ settimane)
1. Export PDF/ICS itinerario
2. Salvataggio viaggi preferiti
3. Tracciamento versioni itinerario e confronto modifiche
