import { useMemo, useState, useEffect } from "react";
import { InputContract, type OutputContractType } from "../../../src/shared/contract";

type Status = "idle" | "loading" | "error" | "done";

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<OutputContractType | null>(null);

  // Date Logic
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  
  // Auto-update end date min when start date changes
  useEffect(() => {
    if (startDate && !endDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 7); // Default 7 days
      setEndDate(d.toISOString().split("T")[0]);
    }
  }, [startDate]);

  const [budgetMin, setBudgetMin] = useState(2500);
  const [budgetMax, setBudgetMax] = useState(3500);
  const [noCar, setNoCar] = useState(true);
  const [lowCrowd, setLowCrowd] = useState(true);
  
  // UX: Simulated progress messages
  const [loadingMsg, setLoadingMsg] = useState("");

  const payload = useMemo(() => {
    const constraints: string[] = [];
    if (noCar) constraints.push("no_car");
    if (lowCrowd) constraints.push("low_crowd");
    constraints.push("no_generic_resort");

    // Calculate duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    return {
      travel_dates: { from: startDate, to: endDate, month: null },
      duration_days: duration > 0 ? duration : 7,
      budget_total: { min: budgetMin, max: budgetMax },
      departure_airports: [],
      pace: "slow",
      priorities: ["sea", "food", "relax"],
      constraints
    };
  }, [startDate, endDate, budgetMin, budgetMax, noCar, lowCrowd]);

  // UX: Cycle through messages while loading
  useMemo(() => {
    if (status !== "loading") return;
    
    const messages = [
      "Analizzo il periodo e il budget...",
      "Cerco destinazioni autentiche e poco affollate...",
      "Verifico meteo e collegamenti...",
      "Seleziono le sistemazioni migliori...",
      "Finalizzo i dettagli del viaggio..."
    ];
    
    let i = 0;
    setLoadingMsg(messages[0]);
    
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMsg(messages[i]);
    }, 3500); 
    
    return () => clearInterval(interval);
  }, [status]);

  async function onGenerate() {
    setStatus("loading");
    setError("");
    setResult(null);

    const validated = InputContract.safeParse(payload);
    if (!validated.success) {
      setStatus("error");
      setError("Input non valido. Controlla le date e il budget.");
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
            <label>Data Partenza</label>
            <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Data Ritorno</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
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
          {status === "loading" ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span className="spinner">⏳</span> {loadingMsg}
            </span>
          ) : "Genera Proposte"}
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
              {/* Summary Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{p.title}</h3>
                    <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.25rem" }}>
                        {p.best_time_to_go.summary}
                    </div>
                </div>
                <div style={{ textAlign: "right", fontWeight: "bold", color: "var(--color-primary)" }}>
                    €{p.budget_breakdown.total.min} – €{p.budget_breakdown.total.max}
                </div>
              </div>

              {/* Highlights Chips */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                  {p.why_it_fits.slice(0, 3).map((tag, i) => (
                      <span key={i} style={{ background: "#e0f7fa", color: "#006064", padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem" }}>
                          {tag}
                      </span>
                  ))}
              </div>

              <details>
                <summary>Vedi Dettagli Itinerario</summary>
                
                <div className="proposal-section">
                    <h4>Itinerario At a Glance</h4>
                    <div style={{ display: "grid", gap: "10px", borderLeft: "2px solid #eee", paddingLeft: "15px" }}>
                        {p.day_by_day.map((d) => (
                            <div key={d.day} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px", alignItems: "baseline" }}>
                                <span style={{ fontWeight: "bold", color: "#999", fontSize: "0.9rem" }}>Giorno {d.day}</span>
                                <div>
                                    <strong style={{ color: "var(--color-text)" }}>{d.base_location}</strong>
                                    <div style={{ fontSize: "0.9rem", color: "#555" }}>{d.plan.join(", ")}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="proposal-section">
                    <h4>Logistica & Budget</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "0.9rem" }}>
                        <div>
                            <strong>Voli:</strong> €{p.budget_breakdown.flights.min}-{p.budget_breakdown.flights.max}
                            <br/>
                            <a href="#" style={{ color: "var(--color-primary)", textDecoration: "underline" }} onClick={(e) => { e.preventDefault(); alert("Link di ricerca voli non ancora implementato nella demo"); }}>Cerca Voli</a>
                        </div>
                        <div>
                            <strong>Alloggi:</strong> €{p.budget_breakdown.accommodation.min}-{p.budget_breakdown.accommodation.max}
                        </div>
                    </div>
                </div>
              </details>
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
