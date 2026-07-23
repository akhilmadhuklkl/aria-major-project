# ARIA Major Project

ARIA stands for Adaptive Response Intelligence Assistant. It is an AI-assisted customer support prototype built for the MCA major project. The system helps customers ask support questions, helps support agents review AI suggestions, stores feedback, retrieves verified business knowledge, and displays support analytics.

## Project Overview

ARIA demonstrates a full-stack customer support workflow:

- customer chat with AI-assisted responses
- agent workspace with accept, edit, regenerate, and reject actions
- knowledge base for policies, FAQs, and support procedures
- semantic retrieval using stored knowledge records
- SQLite persistence for conversations, messages, feedback, knowledge, and embeddings
- feedback learning through customer ratings and agent actions
- analytics dashboard for response quality, source quality, acceptance rate, and support topics
- Mastra and Gemini integration for live AI response generation
- local fallback behavior for stable demos

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite |
| Semantic Retrieval | Hugging Face Transformers.js embeddings |
| AI Orchestration | Mastra |
| LLM Provider | Google Gemini |
| Charts | Recharts |
| Version Control | Git and GitHub |

## Repository Structure

```text
aria-major-project/
|-- README.md
`-- aria-app/
    |-- README.md
    |-- API_REFERENCE.md
    |-- ARCHITECTURE.md
    |-- DATABASE_SCHEMA.md
    |-- FRONTEND_ARCHITECTURE.md
    |-- SYSTEM_WORKFLOWS.md
    |-- src/
    |-- server/
    |-- data/
    |-- public/
    |-- package.json
    `-- vite.config.ts
```

## Run Locally

The runnable application is inside `aria-app/`.

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

Backend API:

```text
http://localhost:8787/api
```

Backend health check:

```text
http://localhost:8787/api/health
```

## Environment Variables

Create `aria-app/.env` from `aria-app/.env.example`.

Example safe configuration:

```env
PORT=<PORT_NUMBER>
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=
MASTRA_AGENT_URL=
```

Do not commit `.env` or real API keys.

## Validation Commands

Run these from `aria-app/`:

```bash
npm run lint
npm run build
npm run validate:final
npm run evaluate:retrieval
npm run evaluate:adaptation
```

## Validation Summary

| Area | Status |
|---|---|
| Frontend build | Passed |
| Lint check | Passed |
| Backend health API | Passed |
| SQLite persistence | Passed |
| Knowledge retrieval | Passed |
| Mastra/Gemini response generation | Passed |
| Customer feedback storage | Passed |
| Agent action storage | Passed |
| Analytics update | Passed |
| Secret safety check | `.env` ignored by Git |



## Key Documentation

- `aria-app/README.md` - application setup and feature guide
- `aria-app/API_REFERENCE.md` - backend API endpoints
- `aria-app/ARCHITECTURE.md` - system architecture
- `aria-app/DATABASE_SCHEMA.md` - SQLite database design
- `aria-app/FRONTEND_ARCHITECTURE.md` - frontend structure
- `aria-app/SYSTEM_WORKFLOWS.md` - end-to-end workflows

## Secret Safety

The repository must not contain:

- `.env`
- Gemini API keys
- tokens or passwords
- local SQLite database files
- model cache files
- `node_modules`
- production build output

Use `aria-app/.env.example` as the public environment template.

## Current Status

ARIA is final-demo ready as a local full-stack application. The project includes frontend screens, backend APIs, SQLite persistence, semantic retrieval, feedback learning, analytics, Mastra integration, Gemini response generation, validation scripts, and supporting documentation.
