# AI Provider Factory

## Purpose

`createAIProvider` is the composition point for selecting the concrete AI provider. Runtime code depends on the `AIProvider` interface, not on Gemini/OpenRouter/mock classes directly.

```ts
const provider = createAIProvider();
```

## Provider selection rules

| `AI_PROVIDER` value | `NODE_ENV`              | Result                                               |
| ------------------- | ----------------------- | ---------------------------------------------------- |
| Not set / empty     | `development` or `test` | `MockAIProvider`                                     |
| Not set / empty     | `production`            | `GeminiAIProvider`                                   |
| `mock`              | development/production  | `MockAIProvider`                                     |
| `gemini`            | development/production  | `GeminiAIProvider`                                   |
| `openrouter`        | development/production  | `OpenRouterAIProvider`                               |
| any value           | `test`                  | `MockAIProvider` unless an explicit override is used |

Environment parsing lives in `src/config/env.ts`. Provider creation lives in `src/modules/ai/providers/provider-factory.ts`.

## Boundary rule

Only the composition layer should call `createAIProvider`:

- Allowed: `src/app.dependencies.ts`, tests.
- Avoid: routes, use cases, services, normalizers, validators.

This keeps dependencies explicit and makes tests easy to wire with a fake provider.

## Adding a new provider

1. Create `src/modules/ai/providers/<name>.provider.ts` implementing `AIProvider`.
2. Add the provider name to `AIProviderName` in `src/modules/ai/ai.types.ts`.
3. Add the provider name to the Zod enum in `src/config/env.ts`.
4. Add one case in `src/modules/ai/providers/provider-factory.ts`.
5. Add tests for configuration errors, response parsing, and provider error handling.
6. Update `.env.example`, `README.md`, and this document.

## Architecture position

```txt
buildApp / app.dependencies       ← composition root
      │
      ▼
createAIProvider()                ← selects implementation
      │
      ├── MockAIProvider          ← deterministic, no external calls
      ├── GeminiAIProvider        ← Google Gemini API
      └── OpenRouterAIProvider    ← OpenRouter API

Route → Use Case → AIProvider interface → Provider implementation
```

## Key files

| File                                              | Role                                      |
| ------------------------------------------------- | ----------------------------------------- |
| `src/app.dependencies.ts`                         | Composition root for runtime dependencies |
| `src/modules/ai/providers/ai-provider.ts`         | Interface all providers must implement    |
| `src/modules/ai/providers/provider-factory.ts`    | Factory — reads env, returns provider     |
| `src/modules/ai/providers/mock.provider.ts`       | Deterministic mock for dev and tests      |
| `src/modules/ai/providers/gemini.provider.ts`     | Gemini implementation                     |
| `src/modules/ai/providers/openrouter.provider.ts` | OpenRouter implementation                 |
| `src/config/env.ts`                               | Zod-backed environment parsing            |
