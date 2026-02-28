import { useMemo, useState } from "react";
import { InputContract, type OutputContractType } from "../../../src/shared/contract";

type Status = "idle" | "loading" | "error" | "done";

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<OutputContractType | null>(null);

  const [duration, setDuration] = useState(7);
  const [budgetMin, setBudgetMin] = useState(2500);
  const [budgetMax, setBudgetMax] = useState(3500);
  const [month, setMonth] = useState("Giugno");
  const [noCar, setNoCar] = useState(true);
  const [lowCrowd, setLowCrowd] = useState(true);

  const payload = useMemo(() => {
    const constraints: string[] = [];
    if (noCar) constraints.push("no_car");
    if (lowCrowd) constraints.push("low_crowd");
    constraints.push("no_generic_resort");

    return {
      travel_dates: { from: null, to: null, month },
      duration_days: duration,
      budget_total: { min: budgetMin, max: budgetMax },
      departure_airports: [],
      pace: "slow",
      priorities: ["sea", "food", "relax"],
      constraints
    };
  }, [duration, budgetMin, budgetMax, month, noCar, lowCrowd]);

  async function onGenerate() {
    setStatus("loading");
    setError("");
    setResult(null);

    const validated = InputContract.safeParse(payload);
    if (!validated.success) {
      setStatus("error");
      setError("Input non valido. Controlla i campi.");
      return;
    }

    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "Errore server");
      setResult(j);
      setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Errore inatteso");
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>Proponimi un viaggio</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Proposte in stile “I Coralli di Beatrice”: mare, autenticità, meteo e budget trasparenti.
      </p>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label>
          Mese
          <input value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          Durata (giorni)
          <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          Budget min (€)
          <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          Budget max (€)
          <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} style={{ width: "100%", padding: 8 }} />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={noCar} onChange={() => setNoCar(!noCar)} />
          Preferisco senza auto
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={lowCrowd} onChange={() => setLowCrowd(!lowCrowd)} />
          Poco affollato
        </label>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onGenerate} disabled={status === "loading"} style={{ padding: "10px 14px", cursor: "pointer" }}>
          {status === "loading" ? "Genero..." : "Genera proposte"}
        </button>
      </div>

      {status === "error" && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd" }}>
          <strong>Errore:</strong> {error}
        </div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 16 }}>
          <h3>Proposte</h3>
          {result.proposals.map((p) => (
            <div key={p.proposal_id} style={{ padding: 12, border: "1px solid #ddd", marginBottom: 12 }}>
              <h4 style={{ marginTop: 0 }}>{p.title}</h4>
              <ul>
                {p.why_it_fits.map((w, idx) => <li key={idx}>{w}</li>)}
              </ul>

              <p><strong>Quando:</strong> {p.best_time_to_go.summary}</p>

              <p><strong>Budget stimato:</strong> €{p.budget_breakdown.total.min} – €{p.budget_breakdown.total.max}</p>

              <details>
                <summary>Itinerario giorno per giorno</summary>
                {p.day_by_day.map((d) => (
                  <div key={d.day} style={{ marginTop: 8 }}>
                    <strong>Giorno {d.day} — base: {d.base_location}</strong>
                    <ul>{d.plan.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                ))}
              </details>
            </div>
          ))}
          <p style={{ opacity: 0.7, fontSize: 12 }}>
            Generato il: {result.meta.generated_at}. Assunzioni: meta.assumptions.
          </p>
        </div>
      )}
    </div>
  );
}
