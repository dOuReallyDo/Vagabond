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
    <div className="vagabond-widget">
      <div className="vagabond-header">
        <h2>Proponimi un viaggio</h2>
        <p>Proposte in stile “I Coralli di Beatrice”: mare, autenticità, meteo e budget trasparenti.</p>
      </div>

      <div className="vagabond-form">
        <div className="form-row">
          <div className="form-group">
            <label>Mese</label>
            <input type="text" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="Es. Giugno" />
          </div>
          <div className="form-group">
            <label>Durata (giorni)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={3} max={30} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Budget Min (€)</label>
            <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} step={100} />
          </div>
          <div className="form-group">
            <label>Budget Max (€)</label>
            <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} step={100} />
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-group">
            <input type="checkbox" checked={noCar} onChange={() => setNoCar(!noCar)} />
            Preferisco senza auto (o uso minimo)
          </label>
          <label className="checkbox-group">
            <input type="checkbox" checked={lowCrowd} onChange={() => setLowCrowd(!lowCrowd)} />
            Poco affollato (destinazioni minori)
          </label>
        </div>

        <button className="primary-btn" onClick={onGenerate} disabled={status === "loading"}>
          {status === "loading" ? "Sto elaborando le proposte..." : "Genera Proposte"}
        </button>
      </div>

      {status === "error" && (
        <div className="error-box">
          <strong>Errore:</strong> {error}
        </div>
      )}

      {status === "done" && result && (
        <div className="results-container">
          {result.proposals.map((p) => (
            <div key={p.proposal_id} className="proposal-card">
              <h3>{p.title}</h3>
              
              <div className="proposal-section">
                <h4>Perché fa per te</h4>
                <ul>
                  {p.why_it_fits.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>

              <div className="proposal-section">
                <h4>Quando andare</h4>
                <p>{p.best_time_to_go.summary}</p>
              </div>

              <div className="proposal-section">
                <h4>Budget Stimato</h4>
                <p>€{p.budget_breakdown.total.min} – €{p.budget_breakdown.total.max}</p>
              </div>

              <div className="proposal-section">
                <details>
                  <summary>Itinerario Giorno per Giorno</summary>
                  {p.day_by_day.map((d) => (
                    <div key={d.day} className="day-plan">
                      <strong>Giorno {d.day} — {d.base_location}</strong>
                      <ul>{d.plan.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  ))}
                </details>
              </div>
            </div>
          ))}
          <div className="meta-info">
            Generato il: {new Date(result.meta.generated_at).toLocaleString()} • Assunzioni: {result.meta.assumptions.join(", ") || "Standard"}
          </div>
        </div>
      )}
    </div>
  );
}
