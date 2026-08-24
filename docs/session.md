### Goal: 5-Scope Portfolio Search Selector, Dynamic Placeholders, Precision Query Wiring, and Regression Verification.

### Status: COMPLETE

### Done:
- Integrated 5-scope selector (`all`, `title`, `keywords`, `code`, `ids`) into `src/components/portfolio/PortfolioFilter.tsx` with dynamic placeholder switching.
- Connected `searchField` state in `src/app/portfolio/page.tsx` to `GET /api/portfolio` query parameters.
- Enhanced portfolio summary bar to display active search scope (`(keywords)`, `(title)`, `(code)`, `(Asset IDs)`).
- Registered `portfolio-search-field-select` in `docs/tests/SELECTORS.md` and `UT-UI-PORTFOLIO-SEARCH-FIELD-01` in `docs/tests/CATALOG.md`.
- Created comprehensive unit test suite in `src/__tests__/components/PortfolioFilter.test.tsx` and updated `e2e/portfolio.spec.ts`.
- Documented architectural decision ADR-015 in `docs/decisions.md`.
- Verified 100% unit test coverage with 223/223 tests passing across 36 files and E2E portfolio tests passing.

### Next:
- 1. Monitor user search behaviors and consider adding search history / recent queries.
- 2. Explore keyword tag combination suggestions across collections.

### Decisions:
- Single Source of Truth: Reused backend `searchField` parameter (`all`, `title`, `keywords`, `code`, `ids`, `exactKeyword`) for both Portfolio Dashboard and Keyword Suggester.
- Dynamic Placeholders: Context-aware search input placeholder clearly indicates active search scope.
- Canonical Height Alignment: `h-10.5` applied consistently across Date Picker, Scope Dropdown, Search Input, and Sort Dropdown.

### Skills:
- [`consult`](.agents/skills/consult/SKILL.md) — Root-cause analysis of numeric ID substring false positives.
- [`plan`](.agents/skills/plan/SKILL.md) — Architectural specification of 5-scope search filter.
- [`coding`](.agents/skills/coding/SKILL.md) — Implementation of UI dropdown, dynamic placeholders, and page query wiring.
- [`scrutinize`](.agents/skills/scrutinize/SKILL.md) — Rigorous test coverage audit, selector verification, and E2E review.
- [`handoff`](.agents/skills/handoff/SKILL.md) — Session wrap-up, ADR-015 logging, and git synchronization.
