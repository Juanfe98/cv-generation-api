# Next Steps

This guide captures what to do after completing backend internal API authentication.

## 1. Review the backend auth docs

Read these first:

- `docs/api-auth.md` — backend internal API auth contract
- `docs/vercel-proxy.md` — Vercel Function proxy examples for the Vite frontend
- `docs/deployment-auth-checklist.md` — env vars, deployment order, and smoke tests

## 2. Commit the backend changes

Before committing:

```bash
npm run check
```

Then verify no secrets are staged:

```bash
git status --short
git diff --cached
```

Never commit `.env`.

## 3. Add Vercel Functions in the frontend repo

Because the frontend is Vite/static, production browser code must call same-origin Vercel Functions:

```txt
Browser → /api/... on Vercel → Fastify backend
```

Create proxy routes in the frontend repo for:

```txt
/api/ai/generate-experience-bullets
/api/ai/improve-text
/api/ai/analyze-cv
/api/cv/parse
```

Use `docs/vercel-proxy.md` as the implementation guide.

## 4. Update frontend API calls

Production browser code should call:

```txt
/api/ai/improve-text
/api/ai/generate-experience-bullets
/api/ai/analyze-cv
/api/cv/parse
```

not the backend URL directly.

Local development can still call the backend directly, but only with the dev key:

```txt
x-internal-api-key: dev-internal-api-key
```

Never expose the production key in Vite env vars.

## 5. Configure deployment secrets

Backend hosting platform, e.g. Render:

```txt
NODE_ENV=production
INTERNAL_API_KEY=<long-random-secret>
CORS_ORIGIN=https://your-frontend.vercel.app
AI_PROVIDER=<gemini|openrouter>
GEMINI_API_KEY=<if using gemini>
OPENROUTER_API_KEY=<if using openrouter>
```

Vercel frontend/proxy:

```txt
BACKEND_API_URL=https://your-backend.onrender.com
INTERNAL_API_KEY=<same-secret-as-backend>
```

Do not use:

```txt
VITE_INTERNAL_API_KEY
NEXT_PUBLIC_INTERNAL_API_KEY
```

## 6. Deploy and smoke test

Use `docs/deployment-auth-checklist.md`.

Minimum smoke tests:

```bash
curl https://your-backend.onrender.com/health
# expected: 200

curl -X POST https://your-backend.onrender.com/api/ai/improve-text \
  -H 'content-type: application/json' \
  -d '{"text":"Responsible for APIs.","section":"experience"}'
# expected: 401
```

Then test the real frontend flows through Vercel:

- improve text
- generate bullets
- analyze CV
- parse CV upload

## 7. Monitor early usage

Watch for:

- `api_auth_failed` logs
- `401` spikes
- `429` spikes
- AI provider errors
- unexpected token/API spend

## 8. Recommended next product hardening

Before a wider launch, consider:

1. Vercel/edge rate limiting for public proxy routes.
2. CAPTCHA/Turnstile before expensive unauthenticated flows.
3. Sentry or similar error tracking.
4. Basic analytics/usage counters.
5. User authentication.
6. Per-user quotas or paid-plan limits.
7. Database persistence for saved CVs.
8. Privacy policy and data deletion/export plan.
