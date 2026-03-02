# Vagabond AI - v0.2

Vagabond AI è un assistente di viaggio intelligente che trasforma i desideri degli utenti in itinerari completi, visivi e pronti all'uso.

## 🚀 Visione
Eliminare lo stress della pianificazione con un'esperienza di "slow travel" autentica, trasparente sul budget e attenta alla stagionalità.

## ✨ Caratteristiche Principali
- Itinerari dinamici con validazione schema runtime.
- Proxy server-side per Gemini (chiavi API mai esposte al browser).
- Ricerca grounding via Google Search per aumentare affidabilità dei contenuti.
- Mappe interattive e punti geolocalizzati.
- Analisi recensioni alloggi con endpoint dedicato.
- Fallback immagini/link per resilienza UI.

## 🛠️ Tech Stack
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Express + TypeScript (middleware Vite in dev)
- AI: Google Gemini (`gemini-3-flash-preview`) via `@google/genai`
- Contratti: Zod per validazione input/output

## 📦 Struttura del Progetto
- `/src/components`: componenti UI.
- `/src/services`: client API frontend.
- `/src/shared/contract.ts`: schema dati input/output.
- `/src/utils`: utility UI estratte da `App.tsx`.
- `/server.ts`: API server-side (`/api/generate`, `/api/reviews`) con rate limiting e logging.

## 🧪 Comandi utili
```bash
npm run dev
npm run build
npm run lint
```
