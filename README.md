# Test-CaseAI

AI-powered test case generator. Paste acceptance criteria, get enterprise-grade test scenarios (positive, negative, boundary, edge) plus runnable, editable Playwright TypeScript specs.

## Features

- **AI generation** — Groq-powered test scenarios with step-by-step actions and expected results; generation is gated behind a live connection check, and Retry wakes a sleeping free-tier host before re-checking- **Playwright export** — runnable `.spec.ts` output with resilient locators, per-line `WHY` explanations, and an in-app preview/edit modal before download
- **More exports** — CSV, JSON, Markdown
- **Repository** — searchable history of all generations, per-row delete, clear-all
- **Insights** — scenario-type and priority distribution dashboard
- **Dark red/black neumorphic UI** with a cinematic landing page

## Tech stack

- **Client:** React 18, Axios, react-icons
- **Server:** Node.js 20, Express (`server/`)
- **Production API:** Vercel serverless functions (`api/`)
- **AI:** Groq SDK (default model `openai/gpt-oss-120b`, override via `GROQ_MODEL`)
- **Storage:** in-memory (no database required)

## Quick start

**Prerequisites:** Node.js 18+ and a free Groq API key from https://console.groq.com/keys.

```bash
# 1. Install everything (root + client + server + api)
npm run install-all

# 2. Configure — copy .env.example values into .env (root)
GROQ_API_KEY=gsk_your_key_here
# GROQ_MODEL=openai/gpt-oss-120b   # optional override

# 3. Run backend + frontend together
npm run dev
```

- App: http://localhost:3000
- API: http://localhost:5000/api

**Verify the AI connection** (without spending generation quota):

```bash
cd server
npm run test-groq
```

## Scripts

| Command | Where | What |
|---|---|---|
| `npm run dev` | root | Backend + frontend concurrently |
| `npm run build` | root | Production build of the client |
| `npm start` | root | Start backend only (production) |
| `npm run dev` / `npm start` | `server/` | Nodemon / node backend |
| `npm run test-groq` | `server/` | Ping Groq with a minimal request |
| `npm start` / `npm run build` | `client/` | CRA dev server / production build |

## Project structure

```
├── client/           # React app (landing, generate, repository, insights)
├── server/           # Express API for local development
├── api/              # Vercel serverless API (production)
└── vercel.json       # Vercel deploy config
```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/testcases/generate` | Generate scenarios from acceptance criteria |
| GET | `/api/testcases` | List all generated rows |
| GET | `/api/testcases/groq-status` | AI connection status (`connected`, `model`, `latencyMs`) |
| GET | `/api/testcases/statistics` | Counts by scenario type and priority |
| DELETE | `/api/testcases` | Clear all history |
| POST | `/api/export/playwright` | Download generated Playwright `.spec.ts` |
| POST | `/api/export/csv` · `/json` · `/excel` | Download other formats |

In production the client calls same-origin `/api` (see `client/.env.production`).

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | — | Groq Cloud key (never committed; `.env` is gitignored) |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Model for generation + status ping |
| `PORT` | No | `5000` | Backend port |
| `REACT_APP_API_URL` | No | `http://localhost:5000/api` | Backend URL for local dev |

## Deployment

Vercel only. `vercel.json` builds the client and serves the serverless API in `api/` from the same project.

1. Import the repo in Vercel (or `vercel --prod`).
2. Set environment variables: `GROQ_API_KEY` (required), `GROQ_MODEL` (optional, defaults to `openai/gpt-oss-120b`).
3. Redeploy after changing env vars.
