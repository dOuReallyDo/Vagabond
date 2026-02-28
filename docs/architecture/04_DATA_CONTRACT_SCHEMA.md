# JSON Output Contract (Immutable)

The model MUST return ONLY valid JSON matching the contract.

High-level structure:
{
  "meta": { "generated_at": "ISO-8601", "currency": "EUR", "assumptions": [], "disclaimer": "" },
  "user_profile": { ... },
  "proposals": [ ... ],
  "followups": [ ... ]
}

Rules:
- proposals length: 2..4
- costs always min/max
- each POI has evidence_links OR is marked uncertain
- no markdown, no extra text
