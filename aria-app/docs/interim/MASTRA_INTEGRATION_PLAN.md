# Mastra AI Integration Plan

## Current Status

ARIA currently uses a provider-neutral `AgentService` interface:

```text
AgentService.generateResponse(query) -> answer, confidence, sources, escalation decision
```

The implemented `LocalAgentService` allows the application to demonstrate the full
customer-support workflow without depending on an external LLM provider during the
interim review.

## Why This Design Was Chosen

The architecture keeps the AI provider replaceable. The frontend and API routes do
not depend directly on Mastra. This reduces project risk and makes the interim demo
stable even without an API key or internet connection.

## Mastra-Compatible Agent Service

The current implementation can call a remote Mastra agent endpoint through:

```text
RemoteMastraAgentService implements AgentService
```

Responsibilities:

- Create ARIA support agent instructions.
- Retrieve relevant business knowledge.
- Pass conversation context to the LLM.
- Generate response text.
- Return confidence/source metadata.
- Support future tools and workflows.

## Planned Mastra Agent Instructions

```text
You are ARIA, an enterprise customer support assistant.
Use business knowledge and conversation context when answering.
Do not invent policies.
If confidence is low, ask a clarifying question or escalate to a human support agent.
Keep responses professional, concise, and customer-friendly.
```

## Planned Integration Steps

1. Install Mastra packages.
2. Configure OpenAI or Gemini model provider.
3. Create the ARIA support agent in Mastra.
4. Add a knowledge-search tool.
5. Connect stored knowledge records to retrieval.
6. Add conversation memory.
7. Use feedback scores to influence retrieval priority.
8. Set `MASTRA_AGENT_URL` so the existing backend calls the Mastra endpoint.

## Final Phase Value

Mastra will support the proposal's advanced requirements:

- Agent orchestration
- Tool/workflow management
- Memory and context management
- Guardrails and evaluation
- LLM provider abstraction
