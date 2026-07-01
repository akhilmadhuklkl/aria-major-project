# ARIA

Adaptive Response Intelligence Assistant for customer support optimization.

ARIA is a React, Express, SQLite, Mastra-ready support assistant prototype. It demonstrates how a customer support system can generate grounded responses, store feedback, adapt source ranking, and show operational analytics.

## Current Features

- React TypeScript frontend with fixed dashboard shell.
- Agent Workspace for reviewing, editing, accepting, regenerating, and rejecting AI suggestions.
- Customer Chat connected to the backend API.
- Knowledge Base for indexed support policies, FAQs, and procedures.
- Analytics dashboard with response quality, learning signals, source quality, and topic metrics.
- Help and Settings modals for demo guidance and system status.
- Single light-mode dashboard interface for a consistent final demo experience.
- Express backend API.
- SQLite persistence for conversations, messages, feedback, agent actions, knowledge records, and embeddings.
- Semantic retrieval using local MiniLM embeddings through Transformers.js.
- Feedback adaptation ranker with bounded source-quality adjustment.
- Mastra-compatible AI endpoint support with local fallback behavior.
- Gemini provider configuration support for final live LLM generation.

## Prerequisites

- Node.js 22 or newer is recommended because this project uses Node's built-in SQLite support.
- npm
- Optional: Google Gemini API key from Google AI Studio

## Environment Setup

Create a local `.env` file from the safe template:

```bash
copy .env.example .env
```

Minimum local setup:

```env
PORT=8787
```

Optional Gemini and Mastra setup:

```env
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=
MASTRA_AGENT_URL=http://localhost:8787/api/agents/aria-support-agent/generate
```

Never commit `.env` or real API keys.

## Run Locally

Install dependencies:

```bash
npm install
```

Start frontend and backend together:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8787/api
```

Health check:

```text
http://localhost:8787/api/health
```

## Useful Scripts

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run start:server
npm run index:knowledge
npm run evaluate:retrieval
npm run evaluate:adaptation
npm run validate:final
npm run lint
npm run build
npm run preview
```

## Documentation

- [`API_REFERENCE.md`](./API_REFERENCE.md): backend endpoint documentation, request/response examples, validation behavior, and demo API checks.
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md): SQLite schema, entity relationships, data flow, retrieval storage, and feedback-learning persistence.
- [`SYSTEM_WORKFLOWS.md`](./SYSTEM_WORKFLOWS.md): end-to-end workflows for chat, agent actions, knowledge, retrieval, feedback learning, analytics, Mastra fallback, and final demo.
- [`MASTRA_PLATFORM_CHECKLIST.md`](../MASTRA_PLATFORM_CHECKLIST.md): Mastra Platform setup path for the final phase.
- [`DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md): deployment options and final hosting notes.
- [`FINAL_TEST_PLAN.md`](../FINAL_TEST_PLAN.md): final validation checklist and evidence.

## Final Validation

With the backend running locally, execute:

```bash
npm run validate:final
```

The final validation checks:

- backend health
- SQLite database status
- semantic retrieval metadata
- knowledge records
- grounded chat response
- source evidence
- customer feedback storage
- agent action storage
- unrelated-query escalation
- analytics learning summary

To validate a different backend URL:

```bash
set VALIDATION_API_URL=http://localhost:8787/api
npm run validate:final
```

## Semantic Retrieval

ARIA uses Transformers.js with `Xenova/all-MiniLM-L6-v2` to generate local sentence embeddings. Indexed knowledge records are stored as normalized 384-dimensional vectors in SQLite.

Index or refresh knowledge embeddings:

```bash
npm run index:knowledge
```

Evaluate semantic retrieval:

```bash
npm run evaluate:retrieval
```

The evaluator tests paraphrased support questions and unrelated questions. Semantic retrieval is the primary retrieval method. Keyword retrieval remains as a fallback if the embedding runtime is unavailable.

## Feedback Adaptation

ARIA combines semantic similarity with a bounded feedback adjustment:

```text
adjusted score = semantic similarity + feedback adjustment
```

Feedback adjustment is capped at `+/- 0.03`, so customer ratings and agent actions can reorder close matches without overriding clearly relevant knowledge.

Evaluate adaptation safety:

```bash
npm run evaluate:adaptation
```

## Mastra Integration

The frontend always calls ARIA's backend API. This means the UI does not need to change when switching between local fallback generation, local Mastra, or a future Mastra Cloud endpoint.

Local Mastra server mode:

```env
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=
```

Mastra-compatible endpoint:

```text
POST http://localhost:8787/api/agents/aria-support-agent/generate
```

Connect chat generation to a Mastra endpoint:

```env
MASTRA_AGENT_URL=http://localhost:8787/api/agents/aria-support-agent/generate
```

If Mastra or Gemini is unavailable, ARIA keeps the demo stable through the local knowledge fallback.

## Production Build

Create a production build:

```bash
npm run build
```

Preview the built frontend:

```bash
npm run preview
```

The backend must still be running separately for API-backed workflows.

## Git Safety

The following must stay uncommitted:

- `.env`
- API keys
- `node_modules/`
- `dist/`
- SQLite database files under `data/`
- `.cache/`
- logs

Use `.env.example` for documentation and `.env` for local secrets.
