# Internal API Authentication

## Purpose

This backend will be publicly reachable when deployed, but expensive endpoints must only be called by trusted server-side code. The product frontend is a Vite static site deployed to Vercel, so browser code cannot safely hold backend secrets.

The production request path is:

```txt
Browser
  ↓ same-origin request to /api/...
Vercel Function in the frontend project
  ↓ adds x-internal-api-key server-side
Fastify backend
  ↓
AI provider / file parsing / future storage
```

The browser must never receive or send the internal API key.

## Backend authentication contract

Protected backend requests must include this header:

```txt
x-internal-api-key: <secret>
```

The backend reads the expected value from:

```txt
INTERNAL_API_KEY
```

Production deployments must configure a long random value, for example generated with:

```bash
openssl rand -base64 48
```

## Route classification

### Public

```txt
GET /health
```

`/health` stays public so Render/Railway/Fly/etc. can perform health checks without a secret.

### Protected

```txt
POST /api/cv/parse
POST /api/ai/generate-experience-bullets
POST /api/ai/improve-text
POST /api/ai/analyze-cv
```

Future endpoints should be protected by default if they trigger AI calls, file parsing, database writes, storage writes, or other costly/sensitive work.

## Vercel proxy contract

The Vite browser app should call same-origin Vercel Function routes, not the backend directly:

```ts
await fetch('/api/ai/improve-text', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
```

The Vercel Function forwards the request to the backend and attaches the secret server-side:

```ts
await fetch(`${process.env.BACKEND_API_URL}/api/ai/improve-text`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-internal-api-key': process.env.INTERNAL_API_KEY!,
  },
  body: JSON.stringify(payload),
});
```

Required Vercel server-side env vars:

```txt
BACKEND_API_URL=https://your-backend.onrender.com
INTERNAL_API_KEY=<same-secret-as-backend>
```

Do not use these for secrets:

```txt
VITE_INTERNAL_API_KEY=...
NEXT_PUBLIC_INTERNAL_API_KEY=...
```

`VITE_*` and `NEXT_PUBLIC_*` values are exposed to browser code.

## Local development

Local development may call the backend directly for convenience. If `INTERNAL_API_KEY` is unset in development, the backend resolves it to:

```txt
dev-internal-api-key
```

Local frontend requests to protected backend routes should include only this documented development fallback key or a local-only `.env` key. Never use the production `INTERNAL_API_KEY` in Vite/browser code.

## Test environment

If `INTERNAL_API_KEY` is unset while `NODE_ENV=test`, the backend resolves it to:

```txt
test-internal-api-key
```

## Security notes

- Internal API key auth protects the backend from direct public calls.
- It does not stop abuse of public Vercel Function routes.
- Until user auth exists, add proxy-layer protections such as rate limiting, bot protection, or CAPTCHA for expensive flows.
- Never log internal API keys, CV contents, extracted CV text, or AI prompts containing personal data.
