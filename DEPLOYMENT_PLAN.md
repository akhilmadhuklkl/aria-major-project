# ARIA Deployment Plan

Project: Adaptive Response Intelligence Assistant  
Current recommended status: local demo-ready, deployment preparation pending

## Goal

Deploy ARIA safely without exposing secrets and without breaking the working local SQLite + Mastra + Gemini setup.

## Current Local Architecture

| Layer | Technology | Current Status |
|---|---|---|
| Frontend | React + TypeScript + Vite | Working locally |
| Backend | Express API | Working locally |
| Database | SQLite | Working locally |
| AI orchestration | Mastra | Working locally |
| LLM provider | Google Gemini | Working locally |

## Recommended Deployment Strategy

For the final project, keep the local version as the primary verified demo and use deployment as an additional milestone.

| Option | Description | Suitability |
|---|---|---|
| Local full demo | Run frontend, backend, SQLite, Mastra, and Gemini locally | Best for reliable final demo |
| Vercel frontend only | Deploy frontend UI, keep backend local or separate | Easy, but not full-stack by itself |
| Render/Railway backend | Host Express backend with environment variables | Better for backend than serverless SQLite |
| Docker container | Package frontend/backend for portable deployment | Good technical enhancement, extra setup |

## Important SQLite Note

SQLite works very well for the local academic prototype. For serverless deployment, SQLite file persistence may not be durable. If a public production deployment is required, use one of these:

| Choice | Use Case |
|---|---|
| Keep SQLite local | Fastest and safest for final demo |
| Hosted Postgres | Best future cloud database option |
| Mastra storage adapter | Good for Mastra-specific persistence |

## Environment Variables

Never commit `.env`. Configure these only in local `.env` or hosting provider settings:

```env
PORT=8787
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=secret
MASTRA_AGENT_URL=http://localhost:8787/api/agents/aria-support-agent/generate
```

## Deployment Readiness Checklist

| Check | Status |
|---|---|
| `.env` ignored by Git | Complete |
| `node_modules` ignored | Complete |
| `dist` ignored | Complete |
| SQLite database ignored | Complete |
| Production build passes | Complete |
| Lint passes | Complete |
| Live Gemini/Mastra validation passes | Complete |
| GitHub initial commit | Pending |
| Public deployment platform selected | Pending |
| Production environment variables configured | Pending |
| Public URL verified | Pending |

## Recommended Next Action

Create a GitHub backup first. After that, decide whether deployment is required for the final submission or whether the verified local demo is acceptable.
