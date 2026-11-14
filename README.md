# IntentShield 🛡️

**A policy-first security sandbox for AI-agent payment proposals.**

**Live demo:** https://intentshield.vercel.app  
**Built for:** NEAR Hackathon 2026 · AI Security & Defense  
**Source:** https://github.com/bearbaba/IntentShield

AI agents can propose payments, but users should stay in control of spending limits, recipients and approvals. IntentShield demonstrates a deterministic policy gate that inspects an intent before allowing it to move forward.

## What you can try

- **Intent Simulator** — propose a payment in USDC across NEAR, Base, Ethereum, Arbitrum or Solana; get an explainable **ALLOW**, **REVIEW** or **BLOCK** result.
- **Policy Engine** — configure per-transaction and daily budgets, manual review thresholds, approved and blocked recipients, and basic suspicious-instruction screening.
- **Approval Center** — review uncertain proposals, reject or locally approve them, and re-evaluate requests when policy evidence becomes stale.
- **Agent Registry** — enable or disable agents and inspect local evaluation history.
- **Audit Trail & Decision Inspector** — filter outcomes, inspect the rules behind each verdict and export the history as JSON.

Decisions are made by real JavaScript policy rules, not hard-coded page transitions. The memo screen is a documented pattern-based check, not an AI threat classifier.

## Reproduce the demo

Try these built-in scenarios from **Intent Simulator**:

| Scenario | Expected decision | What it demonstrates |
| --- | --- | --- |
| Approved payment · 5 USDC | **ALLOW** | A known recipient below review limits |
| Human review · 125 USDC | **REVIEW** | Human-in-the-loop queue; no automatic approval |
| Budget breach · 500 USDC | **BLOCK** | Per-transaction limit |
| Prompt injection · 25 USDC | **BLOCK** | Suspicious policy-bypass instruction in the memo |
| Unknown recipient · 30 USDC | **REVIEW** | Unrecognized destination and cross-chain review |

To see policy freshness checks, create a 125 USDC review, change a policy rule, then return to **Approval Center** and select **Re-evaluate**. The previous request is preserved as superseded and a new evaluation is recorded.

## Run and test locally

Node.js 20+ is required. There are **no third-party runtime dependencies**, API keys or paid services.

```bash
git clone https://github.com/bearbaba/IntentShield.git
cd IntentShield
npm run dev
```

Open http://127.0.0.1:4173 in your browser.

```bash
npm run check
```

The check command validates JavaScript syntax and runs the automated engine, approval-flow and UI smoke tests. GitHub Actions runs the same checks on pushes and pull requests.

## How it works

```text
Proposed intent + agent identity
             ↓
Input and recipient validation
             ↓
Spending, recipient, routing and memo policies
             ↓
       ALLOW / REVIEW / BLOCK
             ↓
Explainable findings + local audit record
             ↓
Optional human review (local status only)
```

- `src/engine.js` — validation, rule evaluation and review freshness.
- `src/app.js` — simulator, approval workflow, policy editing and audit interface.
- `tests/` — policy regressions, approval recovery and UI smoke tests.
- `scripts/serve.mjs` — dependency-free local development server.

## Scope

**IntentShield is a browser-local security simulation, not a live NEAR Intents or wallet-signing integration.** It does not connect to a wallet, submit transactions or move funds. Decisions, approvals and audit data remain in your browser. Production financial controls would need trusted enforcement at the signing boundary.

The prototype is free to run and demonstrates a path toward safer autonomous financial actions. Future work can connect the policy gateway to verified NEAR Intents proposals and production-grade authorization.

## License

MIT — see [LICENSE](LICENSE).
