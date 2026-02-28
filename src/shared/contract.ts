import { z } from "zod";

// --- Input Schema ---

export const InputContract = z.object({
  travel_dates: z.object({
    from: z.string().nullable(),
    to: z.string().nullable(),
    month: z.string().nullable(),
  }),
  duration_days: z.number().min(1),
  budget_total: z.object({
    min: z.number(),
    max: z.number(),
  }),
  departure_airports: z.array(z.string()),
  pace: z.string(),
  priorities: z.array(z.string()),
  constraints: z.array(z.string()),
});

export type InputContractType = z.infer<typeof InputContract>;

// --- Output Schema ---

export const OutputContract = z.object({
  meta: z.object({
    generated_at: z.string(),
    currency: z.string(),
    assumptions: z.array(z.string()),
    disclaimer: z.string(),
  }),
  user_profile: z.record(z.unknown()), // Flexible for now
  proposals: z.array(
    z.object({
      proposal_id: z.string(),
      title: z.string(),
      why_it_fits: z.array(z.string()),
      best_time_to_go: z.object({
        summary: z.string(),
      }),
      budget_breakdown: z.object({
        total: z.object({ min: z.number(), max: z.number() }),
        flights: z.object({ min: z.number(), max: z.number() }),
        accommodation: z.object({ min: z.number(), max: z.number() }),
      }),
      day_by_day: z.array(
        z.object({
          day: z.number(),
          base_location: z.string(),
          plan: z.array(z.string()),
        })
      ),
    })
  ),
  followups: z.array(
    z.object({
      question: z.string(),
      reason: z.string(),
      field_to_refine: z.string(),
    })
  ).optional(),
  error: z.object({
    message: z.string(),
    details: z.unknown().optional(),
  }).optional(),
});

export type OutputContractType = z.infer<typeof OutputContract>;

// Legacy exports to prevent breaking other files if any
export const TravelInputsSchema = InputContract;
export const TravelPlanSchema = OutputContract;
export type TravelInputs = InputContractType;
export type TravelPlan = OutputContractType;

