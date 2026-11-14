# 🛡️ IntentShield

**A local-first financial firewall for autonomous AI agents.**

**NEAR Hackathon 2026 · AI Security & Defense**  
**Live demo:** https://intentshield.vercel.app (browser-local simulation, no wallet or funds)  
**Status:** Working, dependency-free **simulation prototype**, not a mainnet integration or production wallet firewall.  
**Operating cost:** $0 for running this demo locally. No paid APIs, AI subscriptions, wallet connection, transactions, or hosted services are needed.

## Why

AI agents can propose powerful financial operations, but a natural-language prompt should never be able to override spending rules. IntentShield evaluates every *simulated* intent against a deterministic set of security policies and returns one of:

- **ALLOW:** eligible under this policy, **not** a transaction signature or authorization to spend.
- **REVIEW:** operator approval required; stored in a local approval queue.
- **BLOCK:** proposal rejected by policy.

The user interface and policy engine are real running code. The payment/settlement side is deliberately disabled.

## Run in 30 seconds

You only need **Node.js 20+**, with **no `npm install`** step.

```bash
 git clone https://github.com/bearbaba/IntentShield.git
 cd IntentShield
 npm run dev
```

Open **http://127.0.0.1:4173**. You can also serve the directory with any static HTTP server. The app uses native JavaScript modules and localStorage; no build step or external CDN.

```bash
 npm test
 npm run check
```

## Judge walkthrough: do X, see Y

1. Open **Intent simulator → Approved payment → Run security check**: get **ALLOW** for 5 USDC to `treasury.near`.
2. Select **Human review**: get **REVIEW** for 125 USDC; visit **Approval queue** and choose **Approve locally**. No wallet/transaction is involved.
3. Select **Budget breach**: get **BLOCK** for 500 USDC, above the 250 USDC single-transaction limit.
4. Select **Prompt injection**: get **BLOCK**, and inspect the `SUSPICIOUS_INSTRUCTION` trace. This is an intentionally basic keyword detector, not a trained threat classifier.
5. Select **Unknown recipient**: see **REVIEW** for an unapproved address / cross-chain path.
6. In **Policy engine**, change the review threshold and enable **Strict recipient allowlist**. Repeat scenarios to see the rules actually change outcomes.
7. In **Agent registry**, disable Treasury Copilot and rerun the approved payment: it is **BLOCKED** due to `DISABLED_AGENT`.
8. In **Audit trail**, filter and **Export JSON** to inspect local results. The initial 5 entries are explicitly labeled **SAMPLE**.

## Architecture

```text
Simulated intent (amount USDC, origin, destination, agent, memo)
                       ↓
             Input and address validation
                       ↓
        Deterministic policy evaluator (src/engine.js)
                       ↓
  Denylist → spend limits → allowlist → cross-chain → memo rules
                       ↓
                ALLOW | REVIEW | BLOCK
                       ↓
           Local audit log + review queue
                       ↓
              Never signs or sends funds
```

- `src/engine.js` — pure-ish deterministic decision logic, sample scenarios, input checks and policy defaults. Time stamp metadata is attached after the rule decision; outcome does not depend on wall-clock time.
- `src/app.js` — accessible single-page workspace, policy controls, approval queue, audit export, and local persistence.
- `src/styles.css` — responsive dark-mode UI; no commercial design system.
- `scripts/serve.mjs` — Node static server with restrictive CSP; serves only static resource extensions.
- `tests/engine.test.js` — reproducible risk and fail-closed behavior tests.

### Scope & limitations

This is a **functional policy simulator**, not a deployable safeguard around actual wallet signing:

- No funds, swaps, deposits, NEAR network requests, 1Click quotes, wallet signing or key storage.
- Chain-specific recipient checks are **syntax checks**, not identity proof or full on-chain address validation.
- Spending is represented by an editable *simulated* daily-spend baseline, not chain accounting. An actual system needs atomic reservations and durable spend reconciliation to prevent race conditions and duplicate requests.
- AI injection detection is a **small regular expression for known suspicious phrases**. It cannot reliably detect all prompt injections.
- Approval changes only a local record; it does not trigger signing.
- Audit history in browser localStorage is not tamper-resistant, notarized, or on-chain.
- Client-side rules can be bypassed. **Never use this UI as the sole enforcement boundary for real funds.**

### NEAR integration path (future, not yet claimed)

NEAR Intents allow users to specify outcomes while solvers coordinate settlement. IntentShield is designed as a **pre-execution policy gateway** ahead of a verified quote/transaction path. A future production design should:

1. Accept a normalized intent with wallet identity, nonce, expiry, asset ID, chain ID, destination and amount in base units.
2. Verify exact token metadata and USD valuation from trusted sources; reserve budget atomically server-side.
3. Bind policy decision to a canonical transaction hash, policy version, amount, recipient, nonce and expiration.
4. Re-check policy *at the only signing boundary* (MPC, smart account, delegated signer, or trusted co-signer) to prevent a compromised agent bypassing the UI.
5. Integrate read-only `dry: true` 1Click quotes; proceed to a real quote/sign/deposit only with user consent and wallet/provider security review. Note: **1Click currently has no testnet** and actual swaps involve funds and fees.
6. Record durable tamper-evident audit evidence and reconcile on-chain settlement/reversals.

Official docs: [What are NEAR Intents?](https://docs.agentsonintents.com/getting-started/what-are-intents) · [1Click quickstart](https://docs.agentsonintents.com/integration/distribution-channels/1click-api/quickstart/introduction).

## Security, privacy & cost

- No analytics, trackers, cookies or third-party scripts. No secrets should be pasted into the application.
- No `npm install`, frameworks, paid AI services or required network connections.
- A CSP is sent by the included Node dev server. GitHub Pages/other static hosts may need a separate CSP header config.
- Local storage remains **on your device**; clear it via **Audit trail → Reset demo**.
- For a real financial product, budget for independently reviewed policy infrastructure and transaction fees. **Free demo ≠ free mainnet payments**.

## License

MIT — see [LICENSE](LICENSE).
