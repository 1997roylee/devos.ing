---
name: frontend-standard
description: Project-agnostic frontend coding standards for component structure, state management, and accessibility.
---

# Frontend Coding Standard

Use this skill when implementing or reviewing frontend code.

## Goals

1. Keep UI logic maintainable and predictable.
2. Separate presentation from data-fetching and side effects.
3. Deliver accessible, responsive, and resilient interfaces.

## Structure

1. Organize code by feature or route, not by generic type buckets alone.
2. Keep reusable UI primitives separate from feature-specific components.
3. Keep API clients and transport details outside component rendering code.
4. Keep state ownership close to where it is used, and lift state only when needed.

## Implementation Rules

1. Use typed props and typed API responses end to end.
2. Keep components focused; split when a component handles unrelated concerns.
3. Keep hooks pure and deterministic for the same inputs.
4. Model UI states explicitly: loading, success, empty, and error.
5. Use forms with explicit validation and user-visible error messaging.
6. Ensure keyboard navigation and semantic markup for interactive controls.
7. Treat responsive behavior as a first-class requirement for mobile and desktop.
8. Avoid hidden coupling through global mutable state.
9. Keep render paths free of network side effects.
10. Prefer incremental enhancement over brittle all-or-nothing interactions.

## Testing Expectations

1. Add tests for state transitions and user-visible edge cases.
2. Add tests for form validation and error states when introducing form logic.
3. Add tests for API loading/empty/error UI paths.
4. Run repository quality gates before finalizing:
   - `bun run check`
   - `bun run typecheck`
   - `bun test`
