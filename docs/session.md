### Goal: Remove Daily Briefing navigation menu and related deprecated endpoints/pages pending portfolio dataset maturity.

### Status: COMPLETE

### Done:
- Removed "Daily Briefing" item and unused `Lightbulb` icon import from `src/components/Sidebar.tsx`.
- Removed deprecated UI route `src/app/briefing/page.tsx`.
- Removed deprecated API routes `src/app/api/ai/briefing/route.ts` and `src/app/api/scraper/route.ts`.
- Recorded architectural decision `ADR-005` in `docs/decisions.md` and updated `docs/prd.md`.
- Verified 0 TypeScript errors (`npx tsc --noEmit`) and passed all 64 Vitest unit tests across 14 suites.

### Next:
- 1. Implement Phase 3/4 CSV batch import for stock platform monthly statement uploads.
- 2. Implement SFTP auto-uploader module for Adobe Stock and Shutterstock.

### Decisions:
- Shelved Daily Briefing and unstable scraping modules to focus on complete Portfolio dataset and Sales ingestion first.

### Skills:
- [`coding`](.agents/skills/coding/SKILL.md) — Surgical removal of menu items and deprecated route files.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session wrap-up, decision logging, scoped documentation sync, and git push.
