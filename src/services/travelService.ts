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
    const totalDays = nights + 1;

    const start = new Date(inputs.startDate);
    const dateList = Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return `- Giorno ${i + 1}: ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }).join('\n');

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
Ecco le date esatte per cui DEVI generare l'itinerario:
${dateList}

Per OGNI SINGOLO GIORNO dell'elenco qui sopra, DEVI creare un oggetto nell'array "itinerary" (quindi l'array "itinerary" DEVE avere esattamente ${totalDays} elementi).
Il campo "title" di ogni giorno DEVE includere la data esatta (es. "1 aprile 2026 - Arrivo e prima esplorazione").
Per ogni giorno, DEVI pianificare dettagliatamente:
- Cosa fare la mattina
- Dove pranzare
- Cosa fare il pomeriggio
- Dove cenare
- Cosa fare la sera
Per ogni singola attività (inclusi i pasti) devi specificare l'orario esatto, la durata, i mezzi di trasporto e i tempi di percorrenza. Includi attività principali turistiche e non turistiche a seconda di quanto richiesto nelle note.

9. METEO (CLIMA E VIAGGI): Per la sezione "weatherInfo", DEVI cercare su Google "clima e viaggi ${inputs.destination}" ed estrarre le informazioni ESATTE da quel sito per il mese del viaggio. Riassumi le temperature, il clima, i pro e i contro basandoti esclusivamente su quella fonte.

10. VOLI (GOOGLE FLIGHTS): Genera opzioni di volo realistiche. Se è indicato uno stopover, crea un itinerario multitratta. Il link di prenotazione (\`bookingUrl\`) DEVE essere un link a Google Flights con i parametri corretti (es. https://www.google.com/travel/flights?q=Flights%20to%20\${encodeURIComponent(inputs.destination)}%20from%20\${encodeURIComponent(inputs.departureCity)}%20on%20\${inputs.startDate}%20through%20\${inputs.endDate}). Tieni conto dell'orario di partenza preferito (\${inputs.departureTimePreference}) se specificato.

11. ALLOGGI: Per ogni tappa in "accommodations", DEVI specificare il numero di notti ("nights") che hai stimato per quella tappa.

12. COSTI: I costi di voli, treni e attività devono essere indicati PER PERSONA. Il costo degli hotel deve essere indicato PER CAMERA a notte. Il budget totale ("budgetBreakdown") deve tenere conto del numero di persone (${inputs.people.adults} adulti e ${inputs.people.children.length} bambini).

13. BREVITÀ OBBLIGATORIA (CRITICO): Per evitare errori di superamento del limite di token (8192 tokens), DEVI mantenere TUTTE le descrizioni (description, summary, reviewSummary, pros, cons) ESTREMAMENTE SINTETICHE (massimo 10-15 parole). Sii telegrafico, vai dritto al punto. Non usare frasi lunghe.

Restituisci SOLO JSON valido (zero markdown, zero commenti) con questa struttura esatta:
{
  "budgetWarning": null,
  "destinationOverview": {
    "title": "Nome Destinazione",
    "country": "SOLO il nome della nazione in italiano (es. Francia, Giappone). NON inserire la città.",
    "tagline": "Frase ispirazionale breve",
    "description": "Descrizione evocativa 2-3 frasi",
    "heroImageUrl": "URL immagine reale",
    "attractions": [
      {
        "name": "Nome Attrazione",
        "description": "Descrizione 2 righe con dettagli pratici",
        "sourceUrl": "URL reale",
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
          "description": "Max 10 parole",
          "costEstimate": 25,
          "sourceUrl": "URL affidabile",
          "lat": 0.0000,
          "lng": 0.0000,
          "duration": "2 ore",
          "transport": "Metro Linea 1",
          "travelTime": "15 min",
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
      "nights": 3,
      "options": [
        {
          "name": "Nome Hotel Reale",
          "type": "Boutique Hotel",
          "stars": 4,
          "rating": 8.9,
          "reviewSummary": "Max 10 parole",
          "estimatedPricePerNight": 150,
          "bookingUrl": "URL reale",
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
      "reviewSummary": "Max 10 parole",
      "sourceUrl": "URL reale",
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
  },
  "travelBlogs": [
    {
      "title": "Titolo dell'articolo o del blog",
      "url": "URL reale e funzionante",
      "description": "Breve descrizione di cosa tratta l'articolo"
    }
  ]
}
`;

    if (inputs.modificationRequest && inputs.previousPlan) {
      prompt = `
Sei un esperto agente di viaggi. Hai precedentemente generato questo piano di viaggio:
${JSON.stringify(inputs.previousPlan)}

L'utente ha richiesto le seguenti modifiche o aggiunte:
"${inputs.modificationRequest}"

Aggiorna il piano di viaggio tenendo conto di queste richieste. Mantieni la stessa struttura JSON esatta e le stesse REGOLE ASSOLUTE.
Restituisci SOLO il JSON aggiornato, includendo tutte le sezioni richieste.
`;
    }

    onProgress?.(inputs.modificationRequest ? "Aggiorno l'itinerario..." : "Costruisco l'itinerario personalizzato...");

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt + "\n\nRicorda: SOLO JSON valido, nessun testo extra, nessun blocco markdown.",
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
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

export const getDestinationCountries = async (destination: string): Promise<string[]> => {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.API_KEY && process.env.API_KEY.length > 20) {
      apiKey = process.env.API_KEY;
    }
  }
  if (!apiKey) {
    throw new Error("API Key non trovata.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
In quale nazione si trova la destinazione "${destination}"?
Se il nome corrisponde a più luoghi in nazioni diverse (es. "Boa Vista" può essere a Capo Verde o in Brasile), elenca TUTTE le nazioni possibili.
Se corrisponde a una sola nazione, elenca solo quella.
Se la destinazione è già una nazione (es. "Islanda"), restituisci il nome della nazione in italiano.

Restituisci SOLO un array JSON di stringhe con i nomi delle nazioni in italiano. Esempio: ["Capo Verde", "Brasile"] oppure ["Francia"].
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error("Errore nel recupero delle nazioni:", e);
    return [];
  }
};

export const summarizeAccommodationReviews = async (name: string, city: string) => {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.API_KEY && process.env.API_KEY.length > 20) {
      apiKey = process.env.API_KEY;
    }
  }
  if (!apiKey) {
    throw new Error("API Key non trovata.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Sei un assistente di viaggio esperto. Cerca informazioni e recensioni per l'alloggio "${name}" a "${city}" su siti come Booking.com e TripAdvisor.
Crea un riassunto delle recensioni (pro e contro principali).

Restituisci SOLO JSON valido (zero markdown, zero commenti) con questa struttura esatta:
{
  "summary": "Riassunto delle recensioni (circa 3-4 frasi)",
  "pros": ["Pro 1", "Pro 2"],
  "cons": ["Contro 1", "Contro 2"]
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "";
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("L'AI non ha restituito un JSON valido per le recensioni.");
  }
};
