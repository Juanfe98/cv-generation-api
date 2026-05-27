# Coding Standards

## Clean code rules

- Prefer small functions with one reason to change.
- Use explicit names over comments that explain unclear code.
- Keep side effects at the edges: routes, providers, extractors, config.
- Parse unknown input once at the boundary with Zod or typed validators.
- Throw typed errors from modules; map them to HTTP only in routes/error handlers.

## TypeScript rules

- Keep `strict` mode enabled.
- Prefer `unknown` over `any`.
- Prefer `import type` for type-only imports.
- Avoid non-null assertions unless the invariant is documented nearby.
- Public module APIs should have explicit return types.

## Formatting and linting

Use the project scripts:

```bash
npm run lint
npm run format:check
npm run check
```

Run `npm run format` before committing if formatting fails.

## Environment and secrets

- Never commit `.env` files.
- Add placeholders only to `.env.example`.
- Do not log API keys, request bodies containing CVs, or raw provider payloads in production.
- Centralize environment parsing in `src/config/env.ts`.

## Imports

- Outside a module, prefer importing from that module's `index.ts` when available.
- Deep imports are acceptable for tests and internal files in the same module.
- Do not create circular dependencies between modules.

## Documentation updates

Update docs when you change:

- public endpoints or request/response shapes
- environment variables
- provider selection behavior
- module boundaries or architecture rules
