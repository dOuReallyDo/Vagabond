import type { VercelRequest, VercelResponse } from "@vercel/node";
import { InputContract, OutputContract } from "../src/shared/contract";

const ErrorOut = (message: string, details?: unknown) => ({
  meta: { generated_at: new Date().toISOString(), currency: "EUR", assumptions: [], disclaimer: "" },
  user_profile: {},
  proposals: [],
  followups: [{ question: "Fix the request and retry.", reason: message, field_to_refine: "request" }],
  error: { message, details }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // Rate limiting removed for staging/testing as requested.

  let geminiKey = process.env.GEMINI_API_KEY || "";
  // Sanitize key: remove whitespace and quotes
  geminiKey = geminiKey.trim();
  if ((geminiKey.startsWith('"') && geminiKey.endsWith('"')) || (geminiKey.startsWith("'") && geminiKey.endsWith("'"))) {
    geminiKey = geminiKey.slice(1, -1);
  }

  if (!geminiKey) return res.status(500).json(ErrorOut("Server misconfigured: missing GEMINI_API_KEY"));

  const parsed = InputContract.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(ErrorOut("Invalid input", parsed.error.flatten()));

  const system = `
You are a Travel Designer in the style of "I Coralli di Beatrice".
Style: Pragmatic, method-driven, evidence-backed, low-crowd sea/islands, avoid generic resorts.

CRITICAL RULES:
1. **IMAGES**: Use `https://loremflickr.com/800/600/KEYWORD1,KEYWORD2?lock=UNIQUE_NUMBER`. 
   - KEYWORDS must be specific (e.g., "cala+goloritze,sardinia", "ferry,naples"). 
   - NEVER use generic keywords like "sea" or "travel". 
   - Ensure every image has a different lock number.
2. **LINKS**: 
   - For Flights/Hotels: Provide a SEARCH URL (Google Flights, Booking.com, Skyscanner) pre-filled with the destination/dates if possible. 
   - Example: "https://www.google.com/travel/flights?q=Flights+to+Olbia".
   - Do not invent specific prices for specific links unless verified. Use ranges.
3. **CONTENT**:
   - Costs always ranges with assumptions.
   - If evidence not found, mark uncertainty.

Return ONLY valid JSON that matches the required contract. No markdown. No extra text.
`;

  const user = {
    request: parsed.data,
    output_rules: { proposals_min: 2, proposals_max: 4, currency: "EUR", json_only: true }
  };

  const body = {
    contents: [
      { role: "user", parts: [{ text: system }] },
      { role: "user", parts: [{ text: JSON.stringify(user) }] }
    ],
    generationConfig: { temperature: 0.6 }
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${encodeURIComponent(geminiKey)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    return res.status(502).json(ErrorOut("Upstream model error", txt.slice(0, 800)));
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let json: unknown;
  try { json = JSON.parse(text); }
  catch { return res.status(502).json(ErrorOut("Model did not return valid JSON", text.slice(0, 800))); }

  const out = OutputContract.safeParse(json);
  if (!out.success) return res.status(502).json(ErrorOut("Model output failed schema validation", out.error.flatten()));

  return res.status(200).json(out.data);
}
