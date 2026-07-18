"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Send, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { fleetoraApi } from "../lib/api";

type Insight = { id: string; category: string; severity: "critical" | "warning" | "info"; title: string; description: string; entity?: string; value?: number };
type IntelligenceOverview = {
  period: { from: string; to: string };
  summary: { trips: number; revenue: number; cost: number; profit: number; fraudAlerts: number; maintenanceRisks: number };
  partyBalances: Array<{ name: string; balance: number; debit: number; credit: number }>;
  topTrucks: Array<{ name: string; trips: number; revenue: number; cost: number; profit: number }>;
  fraudAlerts: Insight[];
  profitabilityAdvice: Insight[];
  maintenanceRisks: Insight[];
};

const quickQuestions = ["How much does my highest-outstanding party owe?", "Which truck earned the most this month?", "Show trips with unusual weight differences.", "Which vehicles need maintenance soon?"];
const money = (value: number) => `INR ${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function FleetoraIntelligenceView() {
  const [overview, setOverview] = useState<IntelligenceOverview | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask Fleetora about balances, trucks, trip risks, profitability, or maintenance.");
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOverview(await fleetoraApi<IntelligenceOverview>("/intelligence/overview")); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load Fleetora Intelligence."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function ask(value = question) {
    const prompt = value.trim(); if (!prompt || asking) return;
    setQuestion(prompt); setAsking(true);
    try { const result = await fleetoraApi<{ answer: string; source: string; configured: boolean }>("/intelligence/ask", { method: "POST", body: JSON.stringify({ question: prompt }) }); setAnswer(result.answer); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Fleetora AI could not answer right now."); }
    finally { setAsking(false); }
  }

  const summary = overview?.summary;
  return <motion.main className="module-page intelligence-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <header className="module-header"><div className="module-header-copy"><div className="module-eyebrow"><Sparkles size={15} /> Read-only operations intelligence</div><h1>Fleetora AI Assistant</h1><p>Ask questions across live company data and review automatic risk, profit, and maintenance recommendations.</p></div><button className="module-button module-button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh analysis</button></header>
    {error && <div className="module-inline-error" role="alert">{error}</div>}
    <section className="module-kpis" aria-label="Intelligence summary">
      {[["Completed trips", summary?.trips ?? 0], ["Month profit", money(summary?.profit ?? 0)], ["Risk alerts", summary?.fraudAlerts ?? 0], ["Maintenance risks", summary?.maintenanceRisks ?? 0]].map(([label, value]) => <article className="module-kpi module-tone-blue" key={String(label)}><span className="module-kpi-icon"><Sparkles size={18} /></span><div className="module-kpi-copy"><span>{String(label)}</span><strong>{String(value)}</strong><small>{overview ? `${overview.period.from} to ${overview.period.to}` : "Loading current month"}</small></div></article>)}
    </section>
    <section className="module-data-panel intelligence-assistant-panel">
      <div className="module-section-heading"><div><h2>Ask Fleetora</h2><p>The assistant can only read your active company data; it cannot edit or delete records.</p></div><span className="module-record-count">Read only</span></div>
      <div className="intelligence-quick-questions">{quickQuestions.map(item => <button key={item} type="button" onClick={() => void ask(item)} disabled={asking}>{item}</button>)}</div>
      <div className="intelligence-answer"><span><Sparkles size={17} /></span><p>{asking ? "Analyzing Fleetora records..." : answer}</p></div>
      <form className="intelligence-prompt" onSubmit={event => { event.preventDefault(); void ask(); }}><label><span className="data-visually-hidden">Ask Fleetora AI</span><input value={question} onChange={event => setQuestion(event.target.value)} maxLength={500} placeholder="Ask about a party, truck, route, weight, cost, or maintenance..." /></label><button className="module-button module-button-primary" disabled={asking || question.trim().length < 2}><Send size={16} /> Ask</button></form>
    </section>
    <div className="intelligence-grid">
      <InsightPanel icon={AlertTriangle} title="Trip error and fraud detection" subtitle="Duplicate RST, weight mismatch, unusual rates and high costs" rows={overview?.fraudAlerts ?? []} empty="No trip-risk alerts detected this month." />
      <InsightPanel icon={TrendingUp} title="Profitability advisor" subtitle="Loss-making routes, empty running and minimum-rate guidance" rows={overview?.profitabilityAdvice ?? []} empty="Complete trips with costs and distance to receive recommendations." />
      <InsightPanel icon={Wrench} title="Predictive maintenance watch" subtitle="Overdue, high-priority and next-30-day maintenance risk" rows={overview?.maintenanceRisks ?? []} empty="No open maintenance risks detected." />
      <section className="module-data-panel"><div className="module-section-heading"><div><h2>Top trucks</h2><p>Ranked by current-month profit</p></div><ShieldCheck size={18} /></div><div className="intelligence-ranking">{(overview?.topTrucks ?? []).slice(0, 6).map((truck, index) => <div key={truck.name}><span>{index + 1}</span><div><strong>{truck.name}</strong><small>{truck.trips} trips · {money(truck.revenue)} revenue</small></div><b>{money(truck.profit)}</b></div>)}{!overview?.topTrucks.length && <p className="intelligence-empty">No completed truck records this month.</p>}</div></section>
    </div>
  </motion.main>;
}

function InsightPanel({ icon: Icon, title, subtitle, rows, empty }: { icon: typeof AlertTriangle; title: string; subtitle: string; rows: Insight[]; empty: string }) {
  return <section className="module-data-panel"><div className="module-section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><Icon size={18} /></div><div className="intelligence-insights">{rows.slice(0, 8).map(row => <article key={row.id} className={`intelligence-insight intelligence-${row.severity}`}><span>{row.severity}</span><div><strong>{row.title}</strong><p>{row.description}</p></div></article>)}{!rows.length && <p className="intelligence-empty">{empty}</p>}</div></section>;
}
