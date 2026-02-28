import { TravelInputs, TravelPlan, TravelPlanSchema } from "../shared/contract";
import { GoogleGenAI } from "@google/genai";

export type { TravelInputs };

export type ProgressCallback = (step: string, detail?: string) => void;

export const generateTravelPlan = async (
  inputs: TravelInputs,
  onProgress?: ProgressCallback
): Promise<TravelPlan> => {
  onProgress?.("Inizializzazione richiesta...");

  try {
    // 1. Get API Key
    onProgress?.("Verifica configurazione...");
    
    // First try to get key from server (which reads process.env)
    let apiKey = "";
    try {
      const configRes = await fetch("/api/config");
      if (configRes.ok) {
        const config = await configRes.json();
        apiKey = config.apiKey;
      }
    } catch (e) {
      console.warn("Failed to fetch config from server", e);
    }

    // If server key is missing or looks like a placeholder, try client-side injection
    if (!apiKey || apiKey.length < 20 || apiKey.startsWith("MY_G")) {
       // Try process.env injected by Vite (if any)
       const envKey = process.env.GEMINI_API_KEY;
       if (envKey && envKey.length > 20 && !envKey.startsWith("MY_G")) {
         apiKey = envKey;
       }
    }

    // Sanitize key
    apiKey = apiKey?.trim() || "";
    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
      apiKey = apiKey.slice(1, -1);
    }

    // If still missing/invalid, we cannot proceed, but we won't prompt the user.
    // We'll try to use what we have, or throw a clear error if it's completely empty.
    if (!apiKey || apiKey.length < 20) {
        console.warn("API Key might be invalid or missing. Attempting to use what is available.");
        // If it's completely empty, we can't instantiate GoogleGenAI.
        // However, the user asked to "not ask for api keys".
        // If the environment is not set up, we can't magically make it work.
        // But maybe there's a default key injected by the platform that we missed?
        // Let's check process.env.API_KEY again.
        if (process.env.API_KEY && process.env.API_KEY.length > 20) {
            apiKey = process.env.API_KEY;
        }
    }

    if (!apiKey) {
         throw new Error("Configurazione incompleta: API Key non trovata. Contatta l'amministratore.");
    }

    onProgress?.("Analizzo la destinazione e il periodo...");

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

    onProgress?.("Costruisco l'itinerario personalizzato...");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    
    onProgress?.("Finalizzo i dettagli del viaggio...");

    // 4. Validate Output
    const validationResult = TravelPlanSchema.safeParse(json);
    
    if (!validationResult.success) {
      console.error("Validation Error:", validationResult.error);
      throw new Error("Il piano generato non rispetta il formato richiesto. Riprova.");
    }
    
    return validationResult.data;

  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};
