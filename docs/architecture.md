# Architecture Guide

This project uses a small modular architecture with explicit boundaries. Keep it boring, testable, and easy for humans and AI agents to extend safely.

## Request flow

```txt
HTTP route → use case → service/provider interface → external dependency
```

## Production access boundary

The product frontend is a Vite static site deployed to Vercel. Browser code must call same-origin Vercel Function routes for protected API operations; those functions forward requests to this backend with the internal `x-internal-api-key` header.

See `docs/api-auth.md` for the full internal API authentication contract.

## Layers

### Routes: `src/routes/*.routes.ts`

Routes own HTTP concerns only:

- request/response status codes
- headers/content-type handling
- route-scoped Fastify plugins/parsers
- mapping domain/application errors to HTTP responses

Routes should not contain prompt logic, provider selection, or business workflows.

### Use cases: `src/modules/<module>/use-cases/*.use-case.ts`

Use cases own application workflow:

- validate input
- coordinate extractors/providers/services
- return typed results
- throw typed errors

Use cases receive dependencies as parameters. They do not read environment variables or instantiate concrete providers.

### Domain/module internals: `src/modules/<module>`

Each module keeps its own schemas, errors, prompts, normalizers, extractors, and providers close together. Prefer module-local files over global folders until a concern is truly shared.

### Composition root: `src/app.dependencies.ts`

This is where runtime dependencies are created. Provider factories and concrete implementations are wired here, then passed down to routes.

## Dependency direction

Allowed direction:

```txt
routes → modules → lib/config
composition root → everything it wires
```

Avoid reverse imports:

- modules importing routes
- providers importing routes
- use cases importing Fastify types
- normalizers/prompts reading `process.env`

## AI provider boundary

All providers implement `AIProvider`. The app talks to the interface, not concrete classes.

Provider selection is allowed only in:

- `src/app.dependencies.ts`
- tests
- provider factory tests/documentation

## Testing expectations

- Route tests assert HTTP behavior.
- Use-case tests assert validation and workflow.
- Provider tests assert API parsing and external error mapping.
- Prompt tests assert stable prompt construction.
- Normalizer tests assert unsafe model output is handled.

## When adding a feature

1. Add or update schemas/types.
2. Add the use case.
3. Add provider/service methods only if needed.
4. Add the route as a thin adapter.
5. Add tests at the right layer.
6. Update docs if the architecture or public API changes.
