import express from "express";
import cors from "cors";
import "dotenv/config"; // Load environment variables from .env if present
import { GoogleGenAI } from "@google/genai";
import { TravelInputsSchema, TravelPlanSchema } from "./src/shared/contract";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.post("/api/generate", async (req, res) => {
  try {
    // 1. Validate Input
    const inputs = TravelInputsSchema.parse(req.body);

    // 2. Initialize Gemini (Server-Side Only)
    let apiKey = process.env.GEMINI_API_KEY || "";
    
    // Sanitize key: remove whitespace and quotes
    apiKey = apiKey.trim();
    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
      apiKey = apiKey.slice(1, -1);
    }

    // Debugging: Log masked key
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is missing from process.env");
      throw new Error("GEMINI_API_KEY is not set");
    } else {
      console.log(`✅ GEMINI_API_KEY found. Length: ${apiKey.length}, First 4: ${apiKey.substring(0, 4)}`);
    }

    const ai = new GoogleGenAI({ apiKey });

    // 3. Construct Prompt
    const totalPeople = inputs.people.adults + inputs.people.children.length;
    const nights = Math.round(
      (new Date(inputs.endDate).getTime() - new Date(inputs.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const prompt = `
Sei un esperto agente di viaggi con profonda conoscenza locale. Pianifica un viaggio REALE e CONCRETO.

VIAGGIO:
- Partenza: ${inputs.departureCity}
- Destinazione: ${inputs.destination}
- Periodo: ${inputs.startDate} -> ${inputs.endDate} (${nights} notti)
- Date flessibili: ${inputs.isPeriodFlexible ? "Sì" : "No"}
- Gruppo: ${inputs.people.adults} adulti, ${inputs.people.children.length} bambini (età: ${inputs.people.children.map((c) => c.age).join(", ") || "N/A"})
- Budget TOTALE: €${inputs.budget} per ${totalPeople} persone
- Alloggio preferito: ${inputs.accommodationType}
- Note: ${inputs.notes || "nessuna"}

REGOLE ASSOLUTE:
1. IMMAGINI: NON USARE source.unsplash.com (è dismesso). Usa ESCLUSIVAMENTE: "https://loremflickr.com/800/600/[keyword-in-inglese]?lock=[numero-casuale]" (es. https://loremflickr.com/800/600/colosseum?lock=42).
2. LINK: Usa SOLO URL affidabili: wikipedia.org, tripadvisor.com, booking.com. MAI inventare URL. Se non sei certo, usa: https://www.google.com/search?q=[nome+luogo+urlencoded]
3. COORDINATE: Ogni luogo DEVE avere lat/lng precise (almeno 4 decimali).
4. COSTI: Realistici. Totale non superiore a €${inputs.budget}.
5. HOTEL REALI: Solo strutture che esistono davvero con nomi precisi.
6. ITALIANO CORRETTO: Grammatica italiana perfetta, maiuscole corrette, nessun refuso.
7. RISTORANTI REALI: Solo ristoranti verificabili con indirizzi reali.
8. VELOCITÀ: Sii conciso nelle descrizioni per ridurre i tempi di generazione.

Restituisci SOLO JSON valido (zero markdown, zero commenti) con questa struttura esatta:
{
  "budgetWarning": null,
  "destinationOverview": {
    "title": "Nome Destinazione",
    "tagline": "Frase ispirazionale breve",
    "description": "Descrizione evocativa 2-3 frasi",
    "heroImageUrl": "URL immagine panoramica da Unsplash o Wikimedia",
    "attractions": [
      {
        "name": "Nome Attrazione",
        "description": "Descrizione 2 righe con dettagli pratici",
        "sourceUrl": "URL Wikipedia o TripAdvisor reale",
        "imageUrl": "https://loremflickr.com/...",
        "lat": 0.0000,
        "lng": 0.0000,
        "category": "Cultura",
        "estimatedVisitTime": "2 ore"
      }
    ]
  },
  "weatherInfo": {
    "summary": "Meteo per il periodo specifico",
    "averageTemp": "22°C",
    "pros": "Aspetti positivi della stagione",
    "cons": "Aspetti negativi della stagione",
    "packingTips": "Cosa portare in valigia"
  },
  "safetyAndHealth": {
    "safetyLevel": "Alto",
    "safetyWarnings": "Avvertenze di sicurezza",
    "vaccinationsRequired": "Vaccinazioni necessarie o nessuna",
    "emergencyNumbers": "112 - Emergenze generali",
    "travelInsuranceTip": "Consiglio assicurazione viaggio"
  },
  "itinerary": [
    {
      "day": 1,
      "title": "Titolo Giornata",
      "theme": "Tema della giornata",
      "activities": [
        {
          "time": "09:00",
          "name": "Nome Attività",
          "description": "Descrizione dettagliata con consigli pratici",
          "costEstimate": 25,
          "sourceUrl": "URL affidabile",
          "imageUrl": "https://loremflickr.com/...",
          "lat": 0.0000,
          "lng": 0.0000,
          "duration": "2 ore",
          "tips": "Consiglio insider"
        }
      ]
    }
  ],
  "budgetBreakdown": {
    "flights": 400,
    "accommodation": 800,
    "activities": 300,
    "food": 300,
    "transport": 100,
    "misc": 100,
    "totalEstimated": 2000,
    "perPersonPerDay": 66
  },
  "flights": [
    {
      "airline": "Nome compagnia aerea reale",
      "route": "MXP -> JFK",
      "estimatedPrice": 450,
      "departureTime": "10:30",
      "duration": "9h 30m",
      "bookingUrl": "https://www.expedia.it/Flights-Search",
      "options": ["Opzione tariffaria 1", "Opzione tariffaria 2"]
    }
  ],
  "accommodations": [
    {
      "stopName": "Nome città tappa",
      "options": [
        {
          "name": "Nome Hotel Reale",
          "type": "Boutique Hotel",
          "stars": 4,
          "rating": 8.9,
          "reviewSummary": "Recensione autentica breve",
          "estimatedPricePerNight": 150,
          "bookingUrl": "https://www.booking.com/searchresults.it.html?ss=nome+hotel",
          "imageUrl": "https://loremflickr.com/...",
          "lat": 0.0000,
          "lng": 0.0000,
          "address": "Indirizzo reale",
          "amenities": ["WiFi", "Colazione inclusa"]
        }
      ]
    }
  ],
  "bestRestaurants": [
    {
      "name": "Nome Ristorante Reale",
      "cuisineType": "Cucina locale",
      "rating": 9.0,
      "reviewSummary": "Recensione breve autentica",
      "sourceUrl": "https://www.tripadvisor.it/...",
      "imageUrl": "https://loremflickr.com/...",
      "priceRange": "€€",
      "address": "Indirizzo reale",
      "mustTry": "Piatto da non perdere",
      "lat": 0.0000,
      "lng": 0.0000
    }
  ],
  "mapPoints": [
    { "lat": 0.0000, "lng": 0.0000, "label": "Nome punto", "type": "attraction" }
  ],
  "localTips": ["Consiglio locale 1", "Consiglio locale 2", "Consiglio locale 3"],
  "transportInfo": {
    "localTransport": "Come muoversi in loco",
    "bestApps": ["App utile 1", "App utile 2"],
    "estimatedLocalCost": "5-10€/giorno"
  }
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt + "\n\nRicorda: SOLO JSON valido, nessun testo extra, nessun blocco markdown.",
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("L'AI non ha restituito un JSON valido. Riprova.");
    }
    
    // 4. Validate Output (Phase 3: Reliability)
    const validationResult = TravelPlanSchema.safeParse(json);
    
    if (!validationResult.success) {
      console.error("Validation Error:", validationResult.error);
      // In a real production app, we might retry here or return a partial result.
      // For now, we return a structured error that the frontend can handle.
      throw new Error("Il piano generato non rispetta il formato richiesto. Riprova.");
    }
    
    res.json(validationResult.data);

  } catch (error: any) {
    console.error("Error generating plan:", error);
    res.status(500).json({ 
      error: "Failed to generate travel plan", 
      details: error.message 
    });
  }
});

// Vite Middleware (Must come after API routes)
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
