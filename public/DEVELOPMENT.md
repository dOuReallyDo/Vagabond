# Requisiti di Sviluppo - Vagabond AI

Questo documento descrive i requisiti minimi e le linee guida per lo sviluppo e la manutenzione di Vagabond AI.

## 📋 Requisiti Minimi di Sistema
- **Node.js**: v18.0.0 o superiore
- **npm**: v9.0.0 o superiore
- **Chiave API Gemini**: Necessaria per il funzionamento del motore AI.

## 🛠️ Setup Ambiente di Sviluppo
1. **Clonazione**:
   ```bash
   git clone <your-repo-url>
   cd vagabond-ai
   ```
2. **Installazione Dipendenze**:
   ```bash
   npm install
   ```
3. **Variabili d'Ambiente**:
   Crea un file `.env` nella root del progetto:
   ```env
   GEMINI_API_KEY=la_tua_chiave_qui
   ```

## 🏗️ Architettura Software
L'applicazione segue un pattern **Client-Side First**:
- **TravelService**: Gestisce i prompt complessi inviati a Gemini. Utilizza il "Function Calling" per abilitare la ricerca web e le mappe.
- **State Management**: React Hooks (`useState`, `useEffect`) per gestire il caricamento e i dati del piano di viaggio.
- **UI/UX**: Design responsivo basato su Tailwind CSS con focus sulla leggibilità e l'impatto visivo.

## 🧪 Linee Guida per l'AI
- **Prompt Engineering**: I prompt devono essere strutturati per restituire esclusivamente JSON valido.
- **Grounding**: Utilizzare sempre `googleSearch` e `googleMaps` per evitare allucinazioni su link e coordinate.
- **Fallback**: Implementare sempre logiche di fallback per immagini e link non funzionanti (già presenti in `App.tsx`).

## 🚀 Roadmap v0.2
- Esportazione itinerario in PDF.
- Integrazione con calendari (Google/iCal).
- Sistema di login per salvare i viaggi preferiti.
