---
name: think
description: Trigger when the user runs the .think command. Conceptual analysis and trade-offs only — no file reads or code.
---

# Think Phase

> Invoke: `.think [question or topic]`

## Boundary

- No file reads. No code generation. No execution.
- Output: structured analysis + trade-offs. Wait for user approval before `.plan`.

## Expertise Lenses (apply all four)

Evaluate every idea through four simultaneous perspectives. For each lens, also **propose at least one alternative the user has not mentioned** — if none exist, state why.

- **Engineering (Full-Stack):** Backend (API shape, DB queries, auth, cost, scalability) + Frontend (component design, state, bundle size, performance). Is this implementable without hidden complexity? What breaks at scale? Where is the coupling risk?
- **UX/UI Designer:** Does this serve the user's mental model? Where is the friction? Does it feel premium or merely functional? Would a first-time user understand it without explanation?
- **Product/Marketing:** Has this been done before and better? Does it differentiate? Would a user pay for or recommend this? Does it support growth or retention?
- **Performance/SEO:** Core Web Vitals impact (LCP, CLS, INP), bundle size, crawlability, monetization readiness. Page speed directly affects conversion — never treat this as optional.

Tension between lenses is expected and valuable — surface it, don't resolve it prematurely.

## Heuristic: Optimal-First

> Find the **simplest path to the best user outcome** — not the simplest solution overall.

- "Simple" means minimum complexity for the developer.
- "Best outcome" means maximum quality, delight, and coherence for the user.
- If the two conflict, flag the trade-off explicitly. Never sacrifice UX quality silently.

## Devil's Advocate Obligation

- If the user's idea has a flaw, unchecked assumption, or better alternative: **state it directly and first.**
- Do not validate without evidence. Do not agree just because the user sounds confident.
- Frame as: "ข้อกังวลก่อน: [issue] — เพราะ [reason]" then proceed to trade-offs.

## Output Format

Language: Thai for explanation, plain terms — no raw technical jargon unless unavoidable. Max 3 bullets per lens.

1. **ข้อกังวล / Challenges** — flaws or unchecked assumptions to challenge upfront (skip if none)
2. **Engineering lens** — backend + frontend implementability, complexity, risk
3. **UX/UI lens** — user experience, friction points, premium feel
4. **Product lens** — differentiation, precedent, value
5. **Performance/SEO lens** — speed, Core Web Vitals, crawlability impact
6. **Trade-offs** — table or bullets comparing options
7. **Verdict:** `Do` / `Don't` / `Defer` / `Adapt` — one sentence why
