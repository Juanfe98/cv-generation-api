# ADR 0001: Modular boundaries and composition root

## Status

Accepted

## Context

The API started small and fast. As it grows, AI-assisted changes need clear boundaries to avoid business logic drifting into routes or provider-specific code leaking through the app.

## Decision

We will use a modular architecture:

- modules live under `src/modules/<module>`
- routes are thin HTTP adapters under `src/routes`
- runtime dependencies are created in `src/app.dependencies.ts`
- external AI providers are selected by `createAIProvider` and consumed through the `AIProvider` interface
- environment parsing is centralized in `src/config/env.ts`

## Consequences

Positive:

- features are easier to test in isolation
- providers can be swapped without route/use-case changes
- AI agents have clear files and rules to follow

Trade-offs:

- small features require a little more structure
- dependency wiring is explicit instead of hidden inside classes/functions

## Enforcement

- `AGENTS.md` documents AI-agent rules.
- `docs/architecture.md` documents layer boundaries.
- ESLint/Prettier scripts keep code style consistent.
