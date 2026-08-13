# Microstock Auto-Pilot Design System

This document outlines the design tokens used in the application to ensure consistency across light and dark modes.

## Semantic Colors

We use semantic color names in our Tailwind classes to automatically adapt to the user's theme preference. 
These are defined in `src/app/globals.css` and can be used directly as Tailwind utilities (e.g., `bg-background`, `text-primary`, `border-border`).

### Core Backgrounds
- **background**: The main page background. (Light: `slate-50`, Dark: `slate-950`)
- **surface**: Card or container background. (Light: `white`, Dark: `slate-900`)
- **surface-hover**: Background for hovered items. (Light: `slate-100`, Dark: `slate-800`)

### Text Colors
- **foreground**: Primary text color. (Light: `slate-900`, Dark: `slate-100`)
- **muted**: Secondary, less important text. (Light: `slate-500`, Dark: `slate-400`)

### Borders
- **border**: Default border color for elements. (Light: `slate-200`, Dark: `slate-800`)

### Brand / Accents
- **primary**: Main brand color used for active states, buttons, links. (Light/Dark: `blue-500` / `blue-600`)
- **primary-foreground**: Text color on top of primary background (e.g., white text on blue button).

## Typography
- **Font**: Inter (sans-serif).

## Implementation in Tailwind v4
In Tailwind v4, we define these using the `@theme` directive in `globals.css` with CSS variables:

```css
:root {
  --background: var(--color-slate-50);
  --surface: #ffffff;
  --surface-hover: var(--color-slate-100);
  --foreground: var(--color-slate-900);
  --muted: var(--color-slate-500);
  --border: var(--color-slate-200);
  --primary: var(--color-blue-600);
  --primary-foreground: #ffffff;
}

[data-theme="dark"] {
  --background: var(--color-slate-950);
  --surface: var(--color-slate-900);
  --surface-hover: var(--color-slate-800);
  --foreground: var(--color-slate-100);
  --muted: var(--color-slate-400);
  --border: var(--color-slate-800);
  --primary: var(--color-blue-500);
  --primary-foreground: #ffffff;
}
```

Whenever adding a new UI element, always use semantic classes:
- Bad: `className="bg-white dark:bg-slate-900"`
- Good: `className="bg-surface"`
