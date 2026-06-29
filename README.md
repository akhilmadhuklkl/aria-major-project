# ARIA Major Project

ARIA, the Adaptive Response Intelligence Assistant, is an AI-assisted customer support prototype built for the 21CSA699A Major Project.

The application demonstrates a complete support workflow:

- customer chat with grounded AI responses
- agent workspace for reviewing and acting on AI suggestions
- SQLite persistence for conversations, messages, knowledge, feedback, and agent actions
- semantic knowledge retrieval using local embeddings
- feedback adaptation and source-quality scoring
- analytics dashboard for learning-loop visibility
- optional Mastra/Gemini integration with local fallback support

## Project Location

The runnable application is inside:

```bash
aria-app/
```

## Quick Start

```bash
cd aria-app
npm install
copy .env.example .env
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend health:

```text
http://localhost:8787/api/health
```

## Validation Commands

Run these from `aria-app/`:

```bash
npm run lint
npm run build
npm run validate:final
npm run evaluate:retrieval
npm run evaluate:adaptation
```

## Key Project Documents

- `aria-app/API_REFERENCE.md` documents the Express API endpoints used by the frontend, validation scripts, SQLite persistence, feedback loop, and analytics dashboard.
- `aria-app/DATABASE_SCHEMA.md` documents the SQLite tables, relationships, semantic embedding storage, and feedback-learning data flow.
- `aria-app/SYSTEM_WORKFLOWS.md` documents the end-to-end application workflows and final demo flow.
- `aria-app/MASTRA_PLATFORM_CHECKLIST.md` tracks the Mastra Platform continuation after credits reset.
- `aria-app/FINAL_TEST_PLAN.md` records final validation coverage.
- `PROGRESS_LOG.md` records the implementation timeline.

## Secret Safety

Do not commit `.env`, API keys, local SQLite databases, model caches, `node_modules`, or production build output. These are ignored by Git.

Use `aria-app/.env.example` as the safe template for local environment variables.

## Current Status

The project is local-demo ready. Mastra Cloud setup remains pending until platform credits reset, but the application works locally with SQLite, semantic retrieval, feedback learning, analytics, and a local AI fallback.
