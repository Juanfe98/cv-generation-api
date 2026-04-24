# cv-generation-api

Fastify backend for the CV Builder AI service.

## Requirements

- Node.js >= 18
- npm >= 9

## Installation

```bash
npm install
```

## Local development

```bash
cp .env.example .env
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm test` | Run test suite |

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Port the server listens on |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |

## Endpoints

### GET /health

Returns server health status.

**Response**

```json
{ "status": "ok" }
```

**Example**

```bash
curl http://localhost:3000/health
```
