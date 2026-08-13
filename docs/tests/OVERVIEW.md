# Testing Overview

This document outlines the testing strategy for VectorAutomator.

## Tools
- **Vitest**: Used for unit tests, focusing on custom hooks, contexts, and API Route Handlers.
- **Playwright**: Used for end-to-end (E2E) testing, ensuring the core user journey works as expected.

## Rules
- **Selectors**: Always use `data-testid` attributes defined in `SELECTORS.md` for E2E testing to prevent brittle tests.
- **Test IDs**: Always register test scenarios in `CATALOG.md` with unique Test IDs.
- **Mocking**: External APIs (like AI) should be mocked in unit tests to ensure fast and deterministic execution.
