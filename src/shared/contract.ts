import { z } from "zod";

const EvidenceLink = z.object({
  title: z.string().min(1),
  url: z.string().url()
});

const Poi = z.object({
  name: z.string().min(1),
  type: z.enum(["beach","snorkeling","hike","museum","food","viewpoint","other"]),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  map_link: z.string().url().nullable(),
  evidence_links: z.array(EvidenceLink).default([])
});

const DayPlan = z.object({
  day: z.number().int().min(1),
  base_location: z.string().min(1),
  plan: z.array(z.string().min(1)).min(1),
  poi: z.array(Poi).default([])
});

const BudgetItem = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  notes: z.array(z.string()).default([]),
  evidence_links: z.array(EvidenceLink).default([])
});

const Proposal = z.object({
  proposal_id: z.string().min(1),
  title: z.string().min(1),
  why_it_fits: z.array(z.string().min(1)).min(1),
  best_time_to_go: z.object({
    summary: z.string().min(1),
    weather_notes: z.array(z.string()).default([])
  }),
  route_overview: z.array(z.string()).default([]),
  day_by_day: z.array(DayPlan).min(1),
  budget_breakdown: z.object({
    flights: BudgetItem,
    accommodation: BudgetItem,
    local_transport: BudgetItem,
    food: BudgetItem,
    activities: BudgetItem,
    total: z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
  }),
  logistics: z.object({
    getting_there: z.array(z.string()).default([]),
    getting_around: z.array(z.string()).default([]),
    booking_strategy: z.array(z.string()).default([])
  }),
  risks_and_checks: z.object({
    safety: z.array(z.string()).default([]),
    visa: z.array(z.string()).default([]),
    health: z.array(z.string()).default([]),
    weather: z.array(z.string()).default([])
  }),
  alternatives: z.array(z.object({ title: z.string(), reason: z.string() })).default([])
});

export const OutputContract = z.object({
  meta: z.object({
    generated_at: z.string().min(1),
    currency: z.string().default("EUR"),
    assumptions: z.array(z.string()).default([]),
    disclaimer: z.string().default("")
  }),
  user_profile: z.record(z.string(), z.any()),
  proposals: z.array(Proposal).min(2).max(4),
  followups: z.array(z.object({
    question: z.string(),
    reason: z.string(),
    field_to_refine: z.string()
  })).default([])
});

export type OutputContractType = z.infer<typeof OutputContract>;

export const InputContract = z.object({
  travel_dates: z.object({
    from: z.string().nullable().default(null),
    to: z.string().nullable().default(null),
    month: z.string().nullable().default(null)
  }).default({ from: null, to: null, month: null }),
  duration_days: z.number().int().min(3).max(30),
  budget_total: z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() }),
  departure_airports: z.array(z.string()).default([]),
  pace: z.enum(["slow","medium","intense"]).default("slow"),
  priorities: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([])
});

export type InputContractType = z.infer<typeof InputContract>;
