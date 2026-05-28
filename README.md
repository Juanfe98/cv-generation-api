# cv-generation-api

Fastify + TypeScript backend for the CV Builder AI service. Provides AI-powered CV analysis, bullet generation, and text improvement endpoints.

## Requirements

- Node.js >= 18
- npm >= 9

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Start dev server with hot-reload
npm run dev
```

The server starts on `http://localhost:3000` by default.

For local development `AI_PROVIDER=mock` is the default — no Gemini key required.

See `docs/api-auth.md` for the internal API authentication strategy used by the Vite frontend's Vercel Function proxy.

## Environment variables

| Variable                     | Required                      | Default                                     | Description                                   |
| ---------------------------- | ----------------------------- | ------------------------------------------- | --------------------------------------------- |
| `PORT`                       | No                            | `3000`                                      | Port the server listens on                    |
| `NODE_ENV`                   | No                            | `development`                               | `development` \| `production` \| `test`       |
| `AI_PROVIDER`                | No                            | `mock` (dev), `gemini` (prod)               | `mock` \| `gemini` \| `openrouter`            |
| `INTERNAL_API_KEY`           | Production                    | `dev-internal-api-key` (dev), test fallback | Internal key expected in `x-internal-api-key` |
| `GEMINI_API_KEY`             | When `AI_PROVIDER=gemini`     | —                                           | Google Gemini API key                         |
| `OPENROUTER_API_KEY`         | When `AI_PROVIDER=openrouter` | —                                           | OpenRouter API key                            |
| `OPENROUTER_MODEL`           | No                            | `deepseek/deepseek-chat:free`               | OpenRouter model id                           |
| `CORS_ORIGIN`                | No                            | `http://localhost:5173` (dev), none (prod)  | Allowed browser origin(s), comma-separated    |
| `RATE_LIMIT_MAX`             | No                            | `60`                                        | Shared fallback rate limit max per IP         |
| `RATE_LIMIT_WINDOW`          | No                            | `60000`                                     | Shared fallback window in milliseconds        |
| `AI_RATE_LIMIT_MAX`          | No                            | `RATE_LIMIT_MAX`                            | Max requests per window per IP on `/api/ai/*` |
| `AI_RATE_LIMIT_WINDOW`       | No                            | `RATE_LIMIT_WINDOW`                         | AI rate limit window in milliseconds          |
| `CV_PARSE_RATE_LIMIT_MAX`    | No                            | `10`                                        | Max CV parse requests per window per IP       |
| `CV_PARSE_RATE_LIMIT_WINDOW` | No                            | `RATE_LIMIT_WINDOW`                         | CV parse rate limit window in milliseconds    |

> **Production note:** `CORS_ORIGIN` has no default in production. If unset, cross-origin browser requests are blocked. Set it to your Vercel frontend URL. CORS supports comma-separated origins, but it is not a replacement for internal API authentication.

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start with hot-reload (ts-node-dev)          |
| `npm run build` | Compile TypeScript to `dist/` (cleans first) |
| `npm start`     | Run compiled output — use after `build`      |
| `npm test`      | Run test suite                               |

## API endpoints

### GET /health

Returns server health. Use this as the health check URL in your hosting platform.

```
GET /health
→ 200 { "status": "ok" }
```

### POST /api/ai/generate-experience-bullets

Generates CV bullet suggestions for a given role and context.

```json
// Request
{
  "role": "Backend Engineer",        // required
  "company": "Acme",                 // optional
  "seniority": "Senior",             // optional
  "technologies": ["Node.js"],       // optional
  "responsibilities": "...",         // optional, max 2000 chars
  "targetRole": "Staff Engineer",    // optional
  "tone": "professional"             // optional: professional | concise | impactful
}

// Response 200
{
  "suggestions": [
    { "text": "Led redesign of ...", "reason": "Impact-focused." }
  ]
}
```

### POST /api/ai/improve-text

Returns improved alternatives for a CV text snippet.

```json
// Request
{
  "text": "Responsible for backend services.",  // required, max 3000 chars
  "section": "experience",                      // required: summary | experience | project | education | skills
  "tone": "professional",                       // optional
  "targetRole": "Staff Engineer"                // optional
}

// Response 200
{
  "suggestions": [
    { "text": "Owned backend services ...", "reason": "Removes passive phrasing." }
  ]
}
```

### POST /api/ai/analyze-cv

Returns a structured analysis of a CV with a score, strengths, and improvement suggestions.

```json
// Request
{
  "cv": { ... },                   // required — CV as a JSON object
  "targetRole": "Staff Engineer"   // optional
}

// Response 200
{
  "score": 72,
  "strengths": ["Clear work history", "Good use of action verbs"],
  "improvements": [
    { "section": "summary", "message": "Tailor to Staff Engineer role.", "priority": "high" }
  ]
}
```

### Error responses

All endpoints return errors in this shape:

```json
{
  "error": {
    "code": "AI_VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

| HTTP | Code                     | Cause                                            |
| ---- | ------------------------ | ------------------------------------------------ |
| 400  | `AI_VALIDATION_ERROR`    | Invalid or missing request fields                |
| 413  | —                        | Request body exceeds 256 KB                      |
| 429  | `RATE_LIMIT_EXCEEDED`    | Too many requests from this IP                   |
| 503  | `AI_PROVIDER_ERROR`      | Gemini API unavailable or timed out              |
| 503  | `AI_GENERATION_FAILED`   | Model returned empty response                    |
| 503  | `AI_NORMALIZATION_ERROR` | Model returned unparseable output                |
| 503  | `AI_CONFIGURATION_ERROR` | Missing required env var (e.g. `GEMINI_API_KEY`) |
| 500  | `INTERNAL_ERROR`         | Unexpected server error                          |

## Deployment

The server binds to `0.0.0.0` and reads `PORT` from the environment — it works on Render, Railway, Fly.io, and any standard PaaS without code changes.

### Generic steps

```bash
# 1. Set environment variables in your hosting platform dashboard

# 2. Set the build command
npm install && npm run build

# 3. Set the start command
npm start

# 4. Set the health check path
/health
```

### Frontend API access (Vercel)

The production Vite frontend should not call protected backend routes directly from browser code. Browser code should call same-origin Vercel Function routes, and those functions should forward requests to this backend with `x-internal-api-key`.

Frontend/Vercel server-side environment variables:

```txt
BACKEND_API_URL=https://your-backend-url.onrender.com
INTERNAL_API_KEY=<same-secret-configured-in-backend>
```

Do not expose this secret through `VITE_*` variables. See `docs/api-auth.md` for the full contract, `docs/vercel-proxy.md` for Vercel Function examples, `docs/deployment-auth-checklist.md` before deploying, and `docs/next-steps.md` for the implementation/deployment sequence.

## Deployment checklist

- [ ] `NODE_ENV` set to `production`
- [ ] `INTERNAL_API_KEY` set to a long random production secret
- [ ] `AI_PROVIDER` set to `gemini`
- [ ] Provider API key set (`GEMINI_API_KEY` for Gemini or `OPENROUTER_API_KEY` for OpenRouter)
- [ ] `CORS_ORIGIN` set to the Vercel frontend URL (e.g. `https://cv-builder.vercel.app`)
- [ ] Health check at `/health` returns `200`
- [ ] At least one `/api/ai/*` endpoint returns a valid response
- [ ] Rate limiting is active: three rapid requests to `/api/ai/*` after the limit returns `429`
- [ ] No `.env` file or secrets committed to git
- [ ] `dist/` is in `.gitignore` and not committed
