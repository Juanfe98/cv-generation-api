# AI Agent Governance

Follow these rules when an AI agent changes this repository.

## First read

Before architecture or feature work, read:

1. `docs/architecture.md`
2. `docs/coding-standards.md`
3. Relevant module files under `src/modules/<module>`

## Non-negotiable boundaries

- Do not put business logic in routes.
- Do not instantiate concrete AI providers in routes or use cases.
- Do not read `process.env` outside `src/config/env.ts`, provider constructors, or tests without a clear reason.
- Do not commit secrets, `.env`, `dist/`, `node_modules/`, or local agent settings.
- Do not log raw CV content or API keys.

## Required checks after code changes

Run the smallest relevant checks first, then run the full check when possible:

```bash
npm run lint
npm test
npm run build
npm run check
```

If a check cannot be run, mention why in the final response.

## New feature checklist

- [ ] Schema/input validation added or updated.
- [ ] Use case contains workflow logic.
- [ ] Route remains a thin HTTP adapter.
- [ ] Dependencies are injected from the composition root.
- [ ] Typed errors are used and mapped safely.
- [ ] Tests cover the right layer.
- [ ] Docs and `.env.example` are updated if behavior/config changed.

## Security checklist

- [ ] No credentials in tracked files.
- [ ] `.env.example` contains placeholders only.
- [ ] Error messages do not leak provider URLs, API keys, or raw internals in production.
- [ ] Logs do not include CV payloads or uploaded file contents.
