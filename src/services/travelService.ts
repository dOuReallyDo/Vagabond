import { TravelInputs, TravelPlan } from "../shared/contract";

export type { TravelInputs };

export type ProgressCallback = (step: string, detail?: string) => void;

export const generateTravelPlan = async (
  inputs: TravelInputs,
  onProgress?: ProgressCallback
): Promise<TravelPlan> => {
  onProgress?.("Inizializzazione richiesta...");

  try {
    onProgress?.("Analizzo la destinazione e il periodo...");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || "Errore durante la generazione del piano");
    }

    onProgress?.("Costruisco l'itinerario personalizzato...");
    
    // Simulate a bit of progress for UX since the server response is one big chunk
    // In a real streaming setup, we would read the stream.
    await new Promise(resolve => setTimeout(resolve, 500));
    onProgress?.("Finalizzo i dettagli del viaggio...");

    const plan: TravelPlan = await response.json();
    return plan;
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};
