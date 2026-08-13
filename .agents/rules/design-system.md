---
description: Enforce Design System Semantic Tokens for Tailwind CSS UI
---

# UI & Design System Guidelines

When writing, creating, or refactoring React components or HTML in this project, you MUST adhere strictly to the project's Design System to ensure proper Dark/Light Mode support.

## Semantic Token Enforcement

1. **NEVER hardcode slate/gray colors for backgrounds or text** (e.g., do NOT use `bg-slate-900`, `bg-white`, `text-slate-200`, `text-black`).
2. **ALWAYS use Semantic Tailwind Variables**:
   - `bg-background` for the main page background.
   - `bg-surface` for cards, panels, and container backgrounds.
   - `bg-surface-hover` for hovered states.
   - `text-foreground` for primary text.
   - `text-muted` for secondary or description text.
   - `border-border` for default borders.
   - `bg-primary` / `text-primary` for brand accents (buttons, active links).

3. If you are unsure of the available tokens, you MUST read the `docs/systemdesign.md` file before generating UI code.

Failure to follow these rules will break the Dark/Light mode toggle functionality.
