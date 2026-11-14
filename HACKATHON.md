# IntentShield — NEAR Hackathon 2026

**Primary track:** AI Security & Defense (SEC). **Secondary conceptual fit:** Autonomous Business (BUS); declare only tracks justified by the submitted implementation.
**Public repository:** https://github.com/bearbaba/IntentShield
**Live, read-only simulation demo:** https://intentshield.vercel.app
**Status:** Functional, browser-local security policy simulator. Not an on-chain enforcement service or NEAR mainnet integration.
**Cost to try:** $0, no wallet connection or payment required.

> **Product principle:** AI agents can act autonomously, but never beyond their authorized financial boundaries.

## Why this is relevant

The SEC track explicitly calls for agent spending limits, policy engines, sandboxed wallets, reputation, and scam detection. IntentShield focuses on a deterministic policy gate for *proposed* financial actions before any future trusted signer or NEAR Intents integration. This version does **not** intercept real signatures, verify on-chain recipients, move funds, or assert mainnet-level security.

## Judge walkthrough — visible, reproducible behavior

1. Visit https://intentshield.vercel.app → **Intent simulator**.
2. **Approved payment** (5 USDC, approved NEAR recipient) → **ALLOW**.
3. **Human review** (125 USDC) → **REVIEW**; view it in **Approval queue**. A local approval is not a signature.
4. **Budget breach** (500 USDC) → **BLOCK** for per-transaction limit.
5. **Prompt injection** → **BLOCK**, showing the documented suspicious-instruction pattern; this is a basic regex, not an LLM-powered detector.
6. Select any result in **Audit trail** → **Inspect** to see the findings, score, and policy version.
7. Change the review threshold or disable an agent and re-run a case. Existing pending reviews can become stale and unapprovable under the new conditions.
8. See **Security analytics**, review the distinction between **SAMPLE** and local events, and export the audit JSON.
9. Run `npm test` locally to reproduce engine and UI smoke tests. No dependencies need installation.

## Differentiation and honest limitations

- **Deterministic explainable policy decisions**, rather than an AI-generated security judgment alone.
- **Freshness-checked human review:** stale approvals are not accepted when relevant context or settings have changed.
- **Adaptive Trust insights are observation-only**; no permission increases happen automatically.
- **Zero-cost, no-wallet sandbox** that judges can safely evaluate.
- **Important:** This is **not** a production wallet firewall, Chain Signatures deployment, verified NEAR Intents quote, actual settlement, or tamper-proof audit. For real value transfers, all policies must be re-checked at a trusted signing boundary with atomic spend reservations.

## Official 2026 submission checklist

The organizer's published hackathon site says the deadline is **2026-11-14 23:59 UTC** (**2026-11-15 06:59 Vietnam time**), with judging/results **Nov 16–18 UTC**.

- [x] Public source repository: https://github.com/bearbaba/IntentShield
- [x] Hosted live demo: https://intentshield.vercel.app
- [x] Working local prototype and repeatable policy tests
- [ ] **Publish a public X post** with an actual demo video **or real screenshots of the built product**; explicitly say it was built at NEAR HACKATHON, tag **@NEARProtocol** and **#NEARHackathon**
- [ ] **Collect the X post URL** for the form; a concept art poster alone is not a substitute for an actual product demonstration
- [ ] Fill out official form fields: **project name, team lead, email, team size, track(s), own/team NEAR wallet address, public repository URL, demo post URL, 20–2,000 character project description**, and optional website URL
- [ ] Check the consent box and **submit the form before the deadline**; the submission is not complete until confirmed by the organizer

**NEAR wallet address is mandatory on the form, but wallet connection is not required.** Do not paste private keys, seed phrases, or credentials into the form or repository. No submission has been made by this documentation update.

Official website: https://nearhackathon.com
