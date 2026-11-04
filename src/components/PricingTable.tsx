"use client";

import { useState } from "react";
import { PLANS, PLAN_ORDER, annualSavingsPercent, BillingInterval, PlanId } from "@/lib/plans";

export default function PricingTable() {
  const [interval, setBillingInterval] = useState<BillingInterval>("annual");
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maxSave = Math.max(...PLAN_ORDER.map((id) => annualSavingsPercent(PLANS[id])));

  async function choose(plan: PlanId) {
    if (plan === "free") {
      window.location.href = "/";
      return;
    }
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else setError(data.error ?? "Checkout failed.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div style={{ textAlign: "center" }}>
        <div className="billing-toggle" role="group" aria-label="Billing period">
          <button aria-pressed={interval === "monthly"} onClick={() => setBillingInterval("monthly")}>
            Monthly
          </button>
          <button aria-pressed={interval === "annual"} onClick={() => setBillingInterval("annual")}>
            Annual <span className="save-pill">save up to {maxSave}%</span>
          </button>
        </div>
      </div>
      {error && (
        <div className="alert" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}
      <div className="plans">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const price = interval === "annual" ? p.annual : p.monthly;
          const billedNote =
            p.monthly === 0
              ? "Free forever"
              : interval === "annual"
                ? `$${price * 12} billed yearly`
                : "Billed monthly, cancel anytime";
          return (
            <div key={id} className={`card plan ${p.highlight ? "highlight" : ""}`}>
              {p.highlight && <span className="badge">Most popular</span>}
              <h3>{p.name}</h3>
              <div className="muted small">{p.tagline}</div>
              <div className="price">
                ${price}
                <small> /month</small>
              </div>
              <div className="small muted">{billedNote}</div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                className={`btn ${p.highlight ? "btn-primary" : "btn-ghost"}`}
                onClick={() => choose(id)}
                disabled={busy !== null}
              >
                {busy === id ? "Redirecting…" : p.monthly === 0 ? "Start free" : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
