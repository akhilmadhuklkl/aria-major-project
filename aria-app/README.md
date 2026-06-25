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
npm run index:knowledge
npm run evaluate:retrieval
npm run evaluate:adaptation
```

## Local Knowledge Embeddings

ARIA uses Transformers.js with `Xenova/all-MiniLM-L6-v2` to generate local
sentence embeddings without sending knowledge content to another API.

Run the indexer after installing dependencies or changing knowledge records:

```bash
npm run index:knowledge
```

The command stores one normalized 384-dimensional vector per indexed knowledge
record in SQLite. Content hashes prevent unchanged records from being embedded
again. The downloaded model is cached under `.cache/transformers` and is excluded
from Git.

The live chat flow now uses semantic similarity search as its primary retrieval
method. Keyword retrieval activates automatically if the local embedding runtime
fails. Questions below the semantic threshold are not forced through keyword
matching and are escalated safely.

Evaluate the standalone semantic retriever with paraphrased support questions:

```bash
npm run evaluate:retrieval
```

The retriever embeds each query, compares it with stored knowledge vectors using
cosine similarity, ranks the strongest matches, and rejects results below the
configured similarity threshold. The evaluation command also compares semantic
results with the existing keyword retriever.

Customer chat responses display and persist the retrieval method, source names,
semantic similarity scores, and the actual response provider (`Mastra + Gemini`
or the local knowledge fallback).

## Feedback Adaptation

ARIA calculates per-source quality statistics from customer ratings and agent
accept, edit, and reject actions. The standalone adaptation ranker combines
semantic relevance with a deliberately small feedback adjustment:

```text
adjusted score = semantic similarity + feedback adjustment
```

Feedback influence is capped at `+/- 0.03` and reduced when only a few feedback
records exist. This allows reliable evidence to reorder close semantic matches
without allowing popularity or one rating to override a clearly relevant source.

Run the adaptation safety evaluation with:

```bash
npm run evaluate:adaptation
```

Live chat currently continues to use pure semantic ranking. Connecting the
verified adaptation ranker to live retrieval is the next step.

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
