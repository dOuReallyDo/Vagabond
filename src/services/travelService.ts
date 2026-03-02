import { TravelInputs, TravelPlan, TravelPlanSchema } from "../shared/contract";

export type { TravelInputs };

export type ProgressCallback = (step: string, detail?: string) => void;

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.message || payload.error || `Errore API (${response.status})`;
  } catch {
    return `Errore API (${response.status})`;
  }
}

export const generateTravelPlan = async (
  inputs: TravelInputs,
  onProgress?: ProgressCallback
): Promise<TravelPlan> => {
  onProgress?.("Invio richiesta al server...");

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  onProgress?.("Valido i dati ricevuti...");
  const json = await response.json();
  const validationResult = TravelPlanSchema.safeParse(json);

  if (!validationResult.success) {
    throw new Error("Il piano generato non rispetta il formato richiesto.");
  }

  onProgress?.("Piano pronto!");
  return validationResult.data;
};

export const summarizeAccommodationReviews = async (name: string, city: string) => {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, city }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
};
