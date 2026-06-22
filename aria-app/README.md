# ARIA

Adaptive Response Intelligence Assistant for customer support optimization.

ARIA is a React, Express, and SQLite prototype that demonstrates how an AI-assisted support system can generate grounded responses, collect human feedback, and show performance analytics.

## Current Interim Features

- Agent workspace for reviewing AI-generated replies.
- Customer chat connected to the backend API.
- SQLite persistence for conversations, messages, feedback, and knowledge documents.
- Knowledge-backed local AI fallback for reliable offline demos.
- Customer rating and agent action feedback capture.
- Analytics dashboard generated from stored records.
- Mastra-compatible remote agent adapter through `MASTRA_AGENT_URL`.

## Run Locally

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend health check: `http://localhost:8787/api/health`

Interim readiness check: `http://localhost:8787/api/interim-status`

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run start:server
```

## Mastra Setup for Final Version

The current build works without a live LLM key. To expose local Mastra endpoints
from the Express server, set:

```bash
ENABLE_MASTRA_SERVER=true
MASTRA_MODEL=google/gemini-2.5-flash
GOOGLE_GENERATIVE_AI_API_KEY=your-provider-key
```

Then start the server and call:

```bash
POST http://localhost:8787/api/agents/aria-support-agent/generate
```

Confirm the backend can see the AI configuration at:

```bash
GET http://localhost:8787/api/health
```

The response should include:

```json
{
  "llmProvider": "google-gemini",
  "llmProviderConfigured": true
}
```

If the provider key is missing, Mastra starts correctly but response generation
returns an API-key error. The default local knowledge agent remains available
for demos while credentials or Mastra Cloud credits are pending.

To connect the ARIA chat API to a Mastra endpoint, set:

```bash
MASTRA_AGENT_URL=http://localhost:8787/api/agents/aria-support-agent/generate
```

The local fallback agent remains active if Mastra is unavailable. To connect a
cloud Mastra agent later:

1. Initialize Mastra in the project.
2. Create an ARIA support agent.
3. Expose the agent generate endpoint.
4. Set `MASTRA_AGENT_URL` to that endpoint.
5. Restart the Express API.

The frontend does not need to change because it already calls `/api/chat`.
