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

export const generateTravelPlan = async (inputs: TravelInputs) => {
  const prompt = `
    Agisci come un esperto agente di viaggi di lusso e locale, specializzato in itinerari autentici e "slow travel". 
    Pianifica un viaggio partendo da ${inputs.departureCity} verso ${inputs.destination}.
    
    Dettagli del gruppo: ${inputs.people.adults} adulti e ${inputs.people.children.length} bambini (età: ${inputs.people.children.map(c => c.age).join(', ')}).
    Budget totale: ${inputs.budget}€ (include trasporti, alloggi e tour).
    Periodo: dal ${inputs.startDate} al ${inputs.endDate} (${inputs.isPeriodFlexible ? 'Flessibile' : 'Fisso'}).
    Tipologia alloggi preferita: ${inputs.accommodationType}.
    Note e desideri dell'utente: ${inputs.notes}.

    ISTRUZIONI CRITICHE:
    1. FONTI E LINK: Usa i tools per trovare link REALI e FUNZIONANTI. Testa la validità del link: deve essere un URL pubblico (es. wikipedia.org, lonelyplanet.com, tripadvisor.it, booking.com). Se non sei sicuro, genera un link di ricerca Google: "https://www.google.com/search?q=[nome+preciso+posto]". NON inventare mai URL.
    2. IMMAGINI: Usa il tool googleSearch per trovare URL di immagini REALI, dirette e pubbliche. Ogni attrazione, hotel e ristorante DEVE avere un'immagine diversa e pertinente. Se non ne trovi di valide, scrivi "PLACEHOLDER".
    3. MAPPA: Fornisci coordinate precise e un link Google Maps funzionante.
    4. SPECIFICITÀ: Se l'utente chiede Boa Vista ad Aprile, DEVI includere l'avvistamento delle megattere con link a tour operator reali.

    Restituisci un oggetto JSON strutturato con le seguenti chiavi:
    - budgetWarning: string | null (se il budget è troppo basso per la destinazione/gruppo, spiega perché e cosa suggerisci di tagliare)
    - destinationOverview: { title, description, attractions: [{ name, description, sourceUrl, imageUrl, lat, lng }] }
    - weatherInfo: { summary, pros, cons }
    - safetyAndHealth: { safetyWarnings, vaccinationsRequired }
    - itinerary: [{ day, title, activities: [{ time, description, costEstimate, sourceUrl, imageUrl, lat, lng }] }]
    - budgetBreakdown: { flights, accommodation, activities, food, totalEstimated }
    - flights: [{ airline, route, estimatedPrice, options: [string] }]
    - accommodations: [{ stopName, options: [{ name, type, rating, reviewSummary, estimatedPricePerNight, bookingUrl, imageUrl, lat, lng }] }]
    - bestRestaurants: [{ name, cuisineType, rating, reviewSummary, sourceUrl, imageUrl, priceRange, lat, lng }]
    - mapPoints: [{ lat, lng, label }] (tutti i punti dell'itinerario per la mappa)
    - overallMapUrl: string (URL di Google Maps con l'itinerario)

    VALUTAZIONE BUDGET: Se il budget di ${inputs.budget}€ è insufficiente per coprire voli da ${inputs.departureCity}, alloggi di tipo "${inputs.accommodationType}" e attività per ${inputs.people.adults + inputs.people.children.length} persone, DEVI segnalarlo nel campo "budgetWarning".

    Assicurati che i costi totali non superino il budget di ${inputs.budget}€.
    Usa un tono ispirazionale, professionale e curato.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt + "\n\nIMPORTANTE: Restituisci esclusivamente l'oggetto JSON, senza commenti o blocchi di codice markdown.",
    config: {
      tools: [{ googleSearch: {} }, { googleMaps: {} }],
    },
  });

  const text = response.text || "";
  // Rimuovi eventuali blocchi di codice markdown se presenti
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;
  
  return JSON.parse(jsonStr);
};
