# ARIA Application Architecture

## Current Foundation

- `src/`: React and TypeScript frontend prototype.
- `server/`: Express and TypeScript API.
- `server/agent-service.ts`: provider-neutral agent boundary.
- `LocalAgentService`: deterministic knowledge-backed development agent that works without API keys.
- `RemoteMastraAgentService`: optional Mastra endpoint adapter enabled with `MASTRA_AGENT_URL`.
- `server/mastra-agent-service.ts`: final-phase Mastra integration scaffold.
- `server/database.ts`: SQLite schema, seed data, topic inference, and quality scoring.
- `data/aria.db`: local persistent database created automatically at runtime.

## Integrated Flow

1. Customer submits a message from the React chat.
2. React calls `POST /api/chat`.
3. Express saves the customer message in SQLite.
4. The active `AgentService` retrieves matching business knowledge and generates a grounded response.
5. Express saves the response, confidence, sources, and escalation decision.
6. Customer ratings and agent actions are stored as feedback records.
7. Analytics are calculated from persisted conversations and feedback.

## API Endpoints

- `GET /api/health`
- `POST /api/chat`
- `GET /api/conversations`
- `POST /api/feedback`
- `POST /api/agent-actions`
- `GET /api/knowledge`
- `POST /api/knowledge`
- `GET /api/analytics/summary`
- `GET /api/interim-status`

## Mastra Integration Point

The project now has a Mastra-compatible `AgentService` boundary.
For the interim demo, the local fallback keeps the system usable without live provider keys.
For the final demo, set `MASTRA_AGENT_URL` to a Mastra agent endpoint such as:

```bash
MASTRA_AGENT_URL=http://localhost:4111/api/agents/aria-support-agent/generate
```

This keeps the frontend and API stable while Mastra adds:

- LLM response generation
- Business knowledge retrieval
- Conversation memory
- Tools and workflows
- Scoring and evaluation

## Development Commands

```bash
npm run dev
npm run build
npm run lint
```

`npm run dev` starts the API on port `8787` and Vite on port `5173`.
