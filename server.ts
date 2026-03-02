import express from "express";
import cors from "cors";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { TravelInputsSchema, TravelPlanSchema } from "./src/shared/contract";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  const start = Date.now();

  console.info(JSON.stringify({ level: "info", event: "request.start", requestId, method: req.method, path: req.path }));

  res.on("finish", () => {
    console.info(
      JSON.stringify({
        level: "info",
        event: "request.end",
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      })
    );
  });

  next();
});

const rateWindowMs = 60_000;
const maxRequestsPerWindow = 20;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

const rateLimit: express.RequestHandler = (req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const current = requestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + rateWindowMs });
    return next();
  }

  if (current.count >= maxRequestsPerWindow) {
    return res.status(429).json({ error: "RATE_LIMITED", message: "Troppe richieste, riprova tra poco." });
  }

  current.count += 1;
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestBuckets.entries()) {
    if (value.resetAt <= now) requestBuckets.delete(key);
  }
}, 60_000).unref();

const ReviewSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
});

const ReviewResponseSchema = z.object({
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

function getApiKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
}

function buildPrompt(inputs: z.infer<typeof TravelInputsSchema>): string {
  const totalPeople = inputs.people.adults + inputs.people.children.length;
  const nights = Math.round((new Date(inputs.endDate).getTime() - new Date(inputs.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = nights + 1;
  const start = new Date(inputs.startDate);
  const dateList = Array.from({ length: totalDays })
    .map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return `- Giorno ${i + 1}: ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`;
    })
    .join("\n");

  let prompt = `
Sei un esperto agente di viaggi con profonda conoscenza locale. Pianifica un viaggio REALE e CONCRETO.

VIAGGIO:
- Partenza: ${inputs.departureCity}
- Destinazione: ${inputs.destination}
- Stopover (Tappa intermedia): ${inputs.stopover || "Nessuno"}
- Orario partenza preferito: ${inputs.departureTimePreference || "Indifferente"}
- Periodo: ${inputs.startDate} -> ${inputs.endDate} (${nights} notti, ${totalDays} giorni)
- Date flessibili: ${inputs.isPeriodFlexible ? "Sì" : "No"}
- Gruppo: ${inputs.people.adults} adulti, ${inputs.people.children.length} bambini (età: ${inputs.people.children.map((c) => c.age).join(", ") || "N/A"})
- Budget TOTALE: €${inputs.budget} per ${totalPeople} persone
- Alloggio preferito: ${inputs.accommodationType}
- Note: ${inputs.notes || "nessuna"}

REGOLE ASSOLUTE:
1. IMMAGINI: Usa il tool Google Search SOLO per trovare un'immagine panoramica REALE e pubblica per la destinazione principale (inseriscila in \`heroImageUrl\`). NON inserire immagini per attrazioni, attività, hotel o ristoranti.
2. LINK: Usa SOLO URL affidabili e reali.
3. COORDINATE E MAPPA: Ogni luogo DEVE avere lat/lng precise. Nel campo \`mapPoints\`, DEVI includere obbligatoriamente anche la città di partenza (${inputs.departureCity}) e la destinazione principale (${inputs.destination}).
4. COSTI: Realistici. Totale non superiore a €${inputs.budget}.
5. HOTEL E RISTORANTI REALI: Solo strutture che esistono davvero con nomi precisi. Fornisci 2 opzioni di alloggio per OGNI tappa e 2 opzioni per i ristoranti.
6. ITALIANO CORRETTO: Grammatica italiana perfetta.
7. VELOCITÀ: Sii conciso nelle descrizioni.
8. ITINERARIO COMPLETO E DETTAGLIATO: L'itinerario DEVE coprire TUTTI I ${totalDays} GIORNI del viaggio, senza saltarne nessuno.
${dateList}
9. BREVITÀ OBBLIGATORIA (CRITICO): Mantieni le descrizioni sintetiche (massimo 10-15 parole).

Restituisci SOLO JSON valido (zero markdown, zero commenti).
`;

  if (inputs.modificationRequest && inputs.previousPlan) {
    prompt = `
Sei un esperto agente di viaggi. Hai precedentemente generato questo piano di viaggio:
${JSON.stringify(inputs.previousPlan)}

L'utente ha richiesto le seguenti modifiche o aggiunte:
"${inputs.modificationRequest}"

Aggiorna il piano mantenendo la stessa struttura JSON richiesta.
Restituisci SOLO JSON valido.
`;
  }

  return `${prompt}\n\nRicorda: SOLO JSON valido, nessun testo extra, nessun blocco markdown.`;
}

app.post("/api/generate", rateLimit, async (req, res) => {
  const requestId = res.locals.requestId as string;
  const parsedInput = TravelInputsSchema.safeParse(req.body);
  if (!parsedInput.success) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Payload non valido.", details: parsedInput.error.flatten() });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: "CONFIG_ERROR", message: "Configurazione server incompleta." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: buildPrompt(parsedInput.data),
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const parsedJson = JSON.parse(text);
    const validationResult = TravelPlanSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error(JSON.stringify({ level: "error", event: "schema_validation_failed", requestId, issues: validationResult.error.issues }));
      return res.status(422).json({ error: "INVALID_MODEL_OUTPUT", message: "Output AI non conforme al contratto." });
    }

    return res.json(validationResult.data);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "generate_failed", requestId, error: String(error) }));
    return res.status(502).json({ error: "UPSTREAM_ERROR", message: "Errore nella generazione del piano." });
  }
});

app.post("/api/reviews", rateLimit, async (req, res) => {
  const parsedInput = ReviewSchema.safeParse(req.body);
  if (!parsedInput.success) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Payload non valido." });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: "CONFIG_ERROR", message: "Configurazione server incompleta." });
  }

  const prompt = `
Sei un assistente di viaggio esperto. Cerca recensioni per l'alloggio "${parsedInput.data.name}" a "${parsedInput.data.city}".
Restituisci SOLO JSON valido con questa struttura:
{
  "summary": "Riassunto delle recensioni",
  "pros": ["Pro 1", "Pro 2"],
  "cons": ["Contro 1", "Contro 2"]
}
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    const parsedReview = ReviewResponseSchema.safeParse(parsedJson);
    if (!parsedReview.success) {
      return res.status(422).json({ error: "INVALID_MODEL_OUTPUT", message: "Output recensioni non valido." });
    }

    return res.json(parsedReview.data);
  } catch (error) {
    return res.status(502).json({ error: "UPSTREAM_ERROR", message: "Errore nella generazione del riepilogo recensioni." });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
