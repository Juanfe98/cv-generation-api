# Vercel Function Proxy for the Vite Frontend

## Why this exists

The frontend is a Vite static site deployed to Vercel. Vite code runs in the browser, so it cannot safely store backend secrets.

Protected backend endpoints must be called through Vercel Functions:

```txt
Browser → Vercel Function → Fastify backend
```

The browser calls same-origin `/api/...` routes. The Vercel Function forwards the request to the backend and adds `x-internal-api-key` server-side.

## Required Vercel environment variables

Set these in the Vercel project settings as server-side environment variables:

```txt
BACKEND_API_URL=https://your-backend.onrender.com
INTERNAL_API_KEY=<same-secret-configured-in-backend>
```

Never create secrets with browser-exposed prefixes:

```txt
VITE_INTERNAL_API_KEY=...
NEXT_PUBLIC_INTERNAL_API_KEY=...
```

## Browser usage

Browser code should call the frontend's own `/api/...` routes:

```ts
await fetch('/api/ai/improve-text', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: 'Responsible for backend services.', section: 'experience' }),
});
```

Do not call the backend URL directly in production browser code.

## Example: JSON AI proxy function

For a Vite app on Vercel, create a function such as:

```txt
api/ai/improve-text.ts
```

Example implementation:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  const backendUrl = process.env.BACKEND_API_URL;
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (!backendUrl || !internalApiKey) {
    return res
      .status(500)
      .json({ error: { code: 'PROXY_CONFIG_ERROR', message: 'Proxy is not configured' } });
  }

  const backendResponse = await fetch(`${backendUrl}/api/ai/improve-text`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-api-key': internalApiKey,
    },
    body: JSON.stringify(req.body),
  });

  const body = await backendResponse.text();
  res.status(backendResponse.status);
  res.setHeader('content-type', backendResponse.headers.get('content-type') ?? 'application/json');
  return res.send(body);
}
```

Repeat this pattern for:

```txt
/api/ai/generate-experience-bullets
/api/ai/improve-text
/api/ai/analyze-cv
```

## Multipart upload proxy notes

`POST /api/cv/parse` forwards `multipart/form-data`. For uploads, the proxy must preserve the original request body and content type.

Important notes:

- Keep the backend's 5 MB file limit in mind.
- Validate Vercel Function body/file limits early with real PDF/DOCX uploads.
- Do not parse and re-create multipart payloads unless necessary.
- If multipart proxying becomes unreliable, revisit the architecture with short-lived signed upload tokens or direct backend uploads.

Conceptual flow:

```txt
Browser FormData → Vercel Function /api/cv/parse → Backend /api/cv/parse
```

The Vercel Function still adds:

```txt
x-internal-api-key: <server-side-secret>
```

## Abuse protection reminder

Internal API auth protects the backend from direct public calls, but public Vercel Functions can still be abused. Until user auth exists, consider adding:

- Vercel/edge rate limiting
- Cloudflare or Vercel bot protection
- CAPTCHA/Turnstile before expensive flows
- small request/body limits in the proxy
- monitoring for repeated failures or high-volume usage
