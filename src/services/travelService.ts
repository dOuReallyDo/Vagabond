import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface TravelInputs {
  people: {
    adults: number;
    children: { age: number }[];
  };
  budget: number;
  departureCity: string;
  destination: string;
  startDate: string;
  endDate: string;
  isPeriodFlexible: boolean;
  accommodationType: string;
  notes: string;
}

export type ProgressCallback = (step: string, detail?: string) => void;

export const generateTravelPlan = async (
  inputs: TravelInputs,
  onProgress?: ProgressCallback
) => {
  onProgress?.("Analizzo la destinazione e il periodo...");

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
1. IMMAGINI: Per ogni elemento fornisci un URL immagine da Unsplash (formato: https://source.unsplash.com/featured/800x600/?keyword-specifico-in-inglese) oppure Wikimedia Commons (https://upload.wikimedia.org/...). NON usare Google Images, Flickr, Instagram, Pinterest, loremflickr, picsum.
2. LINK: Usa SOLO URL affidabili: wikipedia.org, tripadvisor.com, booking.com, expedia.com, viator.com. Per hotel usa booking.com. MAI inventare URL. Se non sei certo, usa: https://www.google.com/search?q=[nome+luogo+urlencoded]
3. COORDINATE: Ogni luogo DEVE avere lat/lng precise (almeno 4 decimali). Coordinate REALI, non inventate.
4. COSTI: Realistici. Totale non superiore a €${inputs.budget}.
5. HOTEL REALI: Solo strutture che esistono davvero con nomi precisi.
6. ITALIANO CORRETTO: Grammatica italiana perfetta, maiuscole corrette, nessun refuso.
7. RISTORANTI REALI: Solo ristoranti verificabili con indirizzi reali.

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
        "imageUrl": "https://source.unsplash.com/featured/800x600/?keyword",
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
          "imageUrl": "https://source.unsplash.com/featured/800x600/?keyword",
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
          "imageUrl": "https://source.unsplash.com/featured/800x600/?hotel+room",
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
      "imageUrl": "https://source.unsplash.com/featured/800x600/?food+restaurant",
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

  onProgress?.("Cerco attrazioni e punti di interesse...", inputs.destination);
  await new Promise((r) => setTimeout(r, 500));
  onProgress?.("Verifico hotel e prezzi...");
  await new Promise((r) => setTimeout(r, 500));
  onProgress?.("Costruisco l'itinerario giorno per giorno...");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents:
      prompt +
      "\n\nRicorda: SOLO JSON valido, nessun testo extra, nessun blocco markdown.",
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.3,
    },
  });

  onProgress?.("Verifico link e immagini...");
  await new Promise((r) => setTimeout(r, 400));
  onProgress?.("Preparo la mappa interattiva...");
  await new Promise((r) => setTimeout(r, 300));
  onProgress?.("Il tuo viaggio è quasi pronto...");
  await new Promise((r) => setTimeout(r, 200));

  const text = response.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  return JSON.parse(jsonStr);
};
