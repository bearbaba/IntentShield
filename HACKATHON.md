# IntentShield — NEAR Hackathon 2026

**Track:** AI Security & Defense. **Secondary concept:** Autonomous Business.  
**Public repository:** https://github.com/bearbaba/IntentShield  
**Demo:** Use `npm run dev`, no wallet or paid accounts needed.  

## What judges can verify

Open `README.md` → "Judge walkthrough" for 8 exact click-through steps. Each verdict is recomputed from policy in `src/engine.js` rather than being hard-coded into UI markup. `npm test` runs security test cases. All results are simulated; no chain integration is asserted.

## What makes this relevant to NEAR

NEAR Intents provides outcome-based multi-chain payments. IntentShield prototypes a deterministic policy gateway suitable to sit **before** a future NEAR Intents signing/settlement path, where autonomous agent proposals can be checked for recipient risk, policy limits and human oversight. The actual integration is documented as future work, not represented as finished.

## Submission checklist

- [x] Public repository
- [x] Working local prototype
- [x] Automated engine tests
- [x] Zero-cost demonstration
- [ ] Public hosted demo URL (optional, recommended)
- [ ] Screenshots or video demo publicly posted on X, tagging @NEARProtocol and #NEARHackathon
- [ ] Submit GitHub repository + X demo post using official hackathon form before deadline

**Deadline:** 2026-11-14 at 23:59 UTC. Verify changes at https://nearhackathon.com/ .
