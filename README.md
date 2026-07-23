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
|
|-- README.md
|-- final-report-assets/
|   |-- figure-3-1-system-architecture.svg
|   |-- figure-3-2-data-flow.svg
|   |-- figure-3-3-use-case.svg
|   |-- figure-3-4-database-schema.svg
|   |-- figure-4-1-agent-workspace-interface.png
|   |-- figure-4-2-customer-chat-ai-response.png
|   |-- figure-4-3-knowledge-base-interface.png
|   |-- figure-4-4-analytics-dashboard-interface.png
|   `-- figure-4-5-system-settings-live-status.png
|
`-- aria-app/
    |-- README.md
    |-- API_REFERENCE.md
    |-- ARCHITECTURE.md
    |-- DATABASE_SCHEMA.md
    |-- FRONTEND_ARCHITECTURE.md
    |-- SYSTEM_WORKFLOWS.md
    |-- package.json
    |-- package-lock.json
    |-- vite.config.ts
    |-- eslint.config.js
    |-- tsconfig.json
    |-- tsconfig.app.json
    |-- tsconfig.node.json
    |-- index.html
    |
    |-- public/
    |   |-- favicon.svg
    |   `-- icons.svg
    |
    |-- src/
    |   |-- App.tsx
    |   |-- App.css
    |   |-- index.css
    |   |-- main.tsx
    |   |-- api.ts
    |   |-- constants.ts
    |   |-- types.ts
    |   |-- assets/
    |   |-- mastra/
    |   |   |-- index.ts
    |   |   `-- agents/
    |   `-- components/
    |       |-- AgentWorkspace/
    |       |-- CustomerChat/
    |       |-- KnowledgeBase/
    |       |-- Analytics/
    |       |-- Layout/
    |       `-- Common/
    |
    |-- server/
    |   |-- index.ts
    |   |-- database.ts
    |   |-- env.ts
    |   |-- agent-service.ts
    |   |-- mastra-agent-service.ts
    |   |-- semantic-retrieval.ts
    |   |-- hybrid-retrieval.ts
    |   |-- embedding-service.ts
    |   |-- feedback-adaptation.ts
    |   |-- mastra/
    |   |   |-- index.ts
    |   |   `-- agents/
    |   `-- scripts/
    |       |-- validate-final.ts
    |       |-- index-knowledge.ts
    |       |-- evaluate-retrieval.ts
    |       `-- evaluate-adaptation.ts
    |
    |-- data/
    |   `-- local SQLite database files
    |
    `-- docs/
        `-- ARIA_Final_Demo_and_Viva_Script.docx
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
