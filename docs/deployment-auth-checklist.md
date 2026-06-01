# Deployment Authentication Checklist

Use this checklist before deploying the backend and Vercel frontend/proxy.

## Backend environment variables

Set these in the backend hosting platform, for example Render:

```txt
NODE_ENV=production
INTERNAL_API_KEY=<long-random-secret>
CORS_ORIGIN=https://your-frontend.vercel.app
AI_PROVIDER=<gemini|openrouter>
GEMINI_API_KEY=<required-if-using-gemini>
OPENROUTER_API_KEY=<required-if-using-openrouter>
OPENROUTER_MODEL=deepseek/deepseek-chat:free
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW=60000
AI_RATE_LIMIT_MAX=60
AI_RATE_LIMIT_WINDOW=60000
CV_PARSE_RATE_LIMIT_MAX=10
CV_PARSE_RATE_LIMIT_WINDOW=60000
```

Generate the internal key with:

```bash
openssl rand -base64 48
```

Production backend startup should fail if `INTERNAL_API_KEY` is missing.

`CORS_ORIGIN` supports comma-separated origins if you need to allow both local/staging and production frontends, but CORS is not a replacement for internal API authentication.

## Vercel frontend/proxy environment variables

Set these in the Vercel project settings:

```txt
BACKEND_API_URL=https://your-backend.onrender.com
INTERNAL_API_KEY=<same-secret-as-backend>
```

The Vercel `INTERNAL_API_KEY` value must exactly match the backend `INTERNAL_API_KEY` value.

## Never expose the internal key

Do not create browser-exposed secret variables:

```txt
VITE_INTERNAL_API_KEY=...
NEXT_PUBLIC_INTERNAL_API_KEY=...
```

`VITE_*` and `NEXT_PUBLIC_*` values are bundled into browser-accessible code.

## Deployment order

Recommended order:

1. Generate `INTERNAL_API_KEY`.
2. Configure backend env vars.
3. Deploy backend.
4. Configure Vercel env vars with the same `INTERNAL_API_KEY`.
5. Deploy frontend/proxy.
6. Run smoke tests.

## Debugging auth failures

If protected backend calls return `401`, inspect backend logs for:

```txt
event=api_auth_failed
```

Use the `reason` field to distinguish missing vs invalid keys. The backend intentionally does not log raw key values.

## Smoke tests

Backend direct checks:

```bash
curl https://your-backend.onrender.com/health
# Expected: 200 {"status":"ok"}

curl -X POST https://your-backend.onrender.com/api/ai/improve-text \
  -H 'content-type: application/json' \
  -d '{"text":"Responsible for APIs.","section":"experience"}'
# Expected: 401 UNAUTHORIZED

curl -X POST https://your-backend.onrender.com/api/cv/parse
# Expected: 401 UNAUTHORIZED
```

Authenticated backend check from a trusted terminal only:

```bash
curl -X POST https://your-backend.onrender.com/api/ai/improve-text \
  -H 'content-type: application/json' \
  -H "x-internal-api-key: $INTERNAL_API_KEY" \
  -d '{"text":"Responsible for APIs.","section":"experience"}'
# Expected: normal endpoint response, not 401
```

Frontend/proxy checks:

```txt
Open the deployed frontend and trigger:
- improve text
- generate bullets
- analyze CV
- parse CV upload
```

Expected result: requests go through Vercel `/api/...` routes and protected backend calls succeed.

## Secret rotation

MVP rotation process:

1. Generate a new key.
2. Update backend `INTERNAL_API_KEY`.
3. Update Vercel `INTERNAL_API_KEY` with the same value.
4. Redeploy both services or trigger env refresh if required.
5. Smoke test protected routes through the frontend.
6. Confirm direct backend calls without a key still return `401`.
7. Remove the old key from any local notes or secret stores.

Future improvement: support multiple active keys with `INTERNAL_API_KEYS` to allow zero-downtime rotation.

## Abuse-protection reminders

Internal API auth protects the backend from direct unauthorized calls, but public Vercel Functions can still be abused. Until user authentication and quotas exist, consider:

- Vercel/edge rate limiting
- bot protection or CAPTCHA/Turnstile before expensive actions
- upload size limits at the proxy
- monitoring for repeated `401`, `429`, and AI provider errors
- usage dashboards or alerts for unexpected token spend
