import type { VercelRequest, VercelResponse } from "@vercel/node";
import { InputContract, OutputContract } from "../src/shared/contract";

async function rateLimit(req: VercelRequest) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { ok: true };

  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "unknown").trim();
  const key = `rl:${ip}:${Math.floor(Date.now() / (10 * 60 * 1000))}`;

  const incr = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).catch(() => null);

  if (!incr || !incr.ok) return { ok: true };

  const count = Number(await incr.text());
  if (count === 1) {
    fetch(`${url}/expire/${encodeURIComponent(key)}/600`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  }
  if (count > 20) return { ok: false };
  return { ok: true };
}

const ErrorOut = (message: string, details?: unknown) => ({
  meta: { generated_at: new Date().toISOString(), currency: "EUR", assumptions: [], disclaimer: "" },
  user_profile: {},
  proposals: [],
  followups: [{ question: "Fix the request and retry.", reason: message, field_to_refine: "request" }],
  error: { message, details }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const rl = await rateLimit(req);
  if (!rl.ok) return res.status(429).json(ErrorOut("Too many requests. Please try later."));

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(500).json(ErrorOut("Server misconfigured: missing GEMINI_API_KEY"));

  const parsed = InputContract.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(ErrorOut("Invalid input", parsed.error.flatten()));

  const system = `
You are a Travel Designer in the style of "I Coralli di Beatrice":
- pragmatic, method-driven, evidence-backed, low-crowd sea/islands, avoid generic resorts
- costs always ranges with assumptions
- if evidence not found, mark uncertainty
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
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
