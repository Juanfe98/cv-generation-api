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

## Environment variables

| Variable             | Required                      | Default                                    | Description                                   |
| -------------------- | ----------------------------- | ------------------------------------------ | --------------------------------------------- |
| `PORT`               | No                            | `3000`                                     | Port the server listens on                    |
| `NODE_ENV`           | No                            | `development`                              | `development` \| `production` \| `test`       |
| `AI_PROVIDER`        | No                            | `mock` (dev), `gemini` (prod)              | `mock` \| `gemini` \| `openrouter`            |
| `GEMINI_API_KEY`     | When `AI_PROVIDER=gemini`     | —                                          | Google Gemini API key                         |
| `OPENROUTER_API_KEY` | When `AI_PROVIDER=openrouter` | —                                          | OpenRouter API key                            |
| `OPENROUTER_MODEL`   | No                            | `deepseek/deepseek-chat:free`              | OpenRouter model id                           |
| `CORS_ORIGIN`        | No                            | `http://localhost:5173` (dev), none (prod) | Allowed browser origin                        |
| `RATE_LIMIT_MAX`     | No                            | `60`                                       | Max requests per window per IP on `/api/ai/*` |
| `RATE_LIMIT_WINDOW`  | No                            | `60000`                                    | Rate limit window in milliseconds             |

> **Production note:** `CORS_ORIGIN` has no default in production. If unset, cross-origin browser requests are blocked. Always set it to your Vercel frontend URL.

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

### Frontend API base URL (Vercel)

In your frontend repository, set an environment variable pointing to this backend:

```
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

Use that variable when constructing API calls instead of hardcoding the URL.

## Deployment checklist

- [ ] `NODE_ENV` set to `production`
- [ ] `AI_PROVIDER` set to `gemini`
- [ ] Provider API key set (`GEMINI_API_KEY` for Gemini or `OPENROUTER_API_KEY` for OpenRouter)
- [ ] `CORS_ORIGIN` set to the Vercel frontend URL (e.g. `https://cv-builder.vercel.app`)
- [ ] Health check at `/health` returns `200`
- [ ] At least one `/api/ai/*` endpoint returns a valid response
- [ ] Rate limiting is active: three rapid requests to `/api/ai/*` after the limit returns `429`
- [ ] No `.env` file or secrets committed to git
- [ ] `dist/` is in `.gitignore` and not committed
