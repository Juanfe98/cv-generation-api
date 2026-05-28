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

See `docs/vercel-proxy.md` for implementation-oriented Vercel Function examples.

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

## Observability for failed authentication

Failed internal API authentication attempts are logged with safe metadata only. Example shape:

```json
{
  "event": "api_auth_failed",
  "reason": "missing_api_key",
  "method": "POST",
  "url": "/api/cv/parse",
  "requestId": "req-1"
}
```

Possible reasons:

```txt
missing_api_key
invalid_api_key
```

When debugging failed proxy/backend calls:

1. Check backend logs for `event=api_auth_failed`.
2. Confirm whether the reason is `missing_api_key` or `invalid_api_key`.
3. Verify the Vercel Function is attaching `x-internal-api-key` server-side.
4. Verify Vercel `INTERNAL_API_KEY` exactly matches backend `INTERNAL_API_KEY`.
5. Never print either secret while debugging.

## CORS policy

`CORS_ORIGIN` controls which browser origins may call the backend directly. It supports a single origin or comma-separated origins:

```txt
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
```

In production, no CORS origin is allowed by default if `CORS_ORIGIN` is unset. This is intentional defense-in-depth. CORS only affects browsers; it does not block `curl`, scripts, Postman, or other servers.

## Rate limiting

Protected backend routes are rate limited after internal API authentication passes:

```txt
/api/ai/*      → AI_RATE_LIMIT_MAX / AI_RATE_LIMIT_WINDOW
/api/cv/parse  → CV_PARSE_RATE_LIMIT_MAX / CV_PARSE_RATE_LIMIT_WINDOW
```

The CV parse limit defaults lower because uploads, file extraction, and parsing are heavier than JSON-only AI actions. If requests come through Vercel Functions, IP-based limits may identify proxy infrastructure rather than individual users; treat this as MVP protection until user auth or edge-level rate limiting exists.

## Security notes

- Internal API key auth protects the backend from direct public calls.
- CORS is not a replacement for internal API authentication.
- Backend rate limiting is not a replacement for frontend/proxy abuse protection.
- It does not stop abuse of public Vercel Function routes.
- Until user auth exists, add proxy-layer protections such as rate limiting, bot protection, or CAPTCHA for expensive flows.
- Never log internal API keys, CV contents, extracted CV text, or AI prompts containing personal data.
