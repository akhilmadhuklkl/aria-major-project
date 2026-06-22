# ARIA Modules And Algorithms

## Frontend Modules

### Agent Workspace

Purpose:

- Displays open support conversations.
- Shows customer conversation history.
- Presents AI-generated suggested responses.
- Allows support agents to accept, edit, regenerate, or reject suggestions.

Current status:

- UI complete.
- Agent action feedback is persisted through the backend.

### Customer Chat

Purpose:

- Allows a customer to ask a support question.
- Sends the query to the backend.
- Displays ARIA's AI response.
- Collects customer rating feedback.

Current status:

- Integrated with backend API.
- Customer messages, AI responses, and ratings are persisted.

### Knowledge Base

Purpose:

- Shows business policies, FAQs, procedures, and support documents.
- Provides the source material used by ARIA for grounded responses.

Current status:

- Reads persisted knowledge records from SQLite.
- Semantic retrieval will be added in the final phase.

### Analytics Dashboard

Purpose:

- Visualizes support performance and feedback quality.
- Displays conversation count, average rating, quality score, acceptance rate,
  correction rate, and topic distribution.

Current status:

- Connected to persistent backend analytics.

## Backend Modules

### Express API Gateway

Purpose:

- Provides REST endpoints for frontend operations.
- Handles chat, feedback, knowledge, conversations, and analytics requests.

Implemented endpoints:

- `GET /api/health`
- `POST /api/chat`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/feedback`
- `POST /api/agent-actions`
- `GET /api/knowledge`
- `POST /api/knowledge`
- `GET /api/analytics/summary`
- `GET /api/interim-status`

### AgentService

Purpose:

- Provides a stable interface for AI response generation.
- Allows the current local agent to be connected to Mastra AI without changing the
  frontend or API routes.

Current implementation:

- `LocalAgentService` performs deterministic knowledge-backed response selection.
- `RemoteMastraAgentService` can call a Mastra agent endpoint through `MASTRA_AGENT_URL`.

Planned implementation:

- A Mastra agent will add tools, memory, and LLM provider
  integration.

### Database Layer

Purpose:

- Persists conversations, messages, feedback, and knowledge records.

Current implementation:

- SQLite using Node's built-in SQLite module.
- Tables are created automatically when the server starts.
- Seed records are inserted for the demo knowledge base and sample conversations.

## Algorithms

### Chat Response Workflow

```text
Input: customer message, optional conversation id
1. Validate the message.
2. Create a new conversation if no conversation id exists.
3. Save the customer message.
4. Send the message to AgentService.
5. Retrieve matching business knowledge.
6. Receive AI answer, confidence, sources, and escalation decision.
7. Save the AI response.
8. Update conversation topic and timestamp.
9. Increment usage count for referenced knowledge sources.
10. Return response to frontend.
```

### Knowledge Retrieval Algorithm

```text
Input: customer message
1. Tokenize the message into searchable terms.
2. Compare terms against knowledge title, category, and content.
3. Score title matches highest, category matches second, and content matches third.
4. Sort documents by score and usage.
5. Return the top matching knowledge documents as response sources.
```

### Topic Inference Algorithm

```text
Input: customer message
1. Convert message to lowercase.
2. If message contains refund terms, assign topic "Refunds".
3. If message contains password/login terms, assign topic "Accounts".
4. If message contains delivery/address terms, assign topic "Delivery".
5. If message contains damaged/product terms, assign topic "Products".
6. If message contains subscription/billing terms, assign topic "Billing".
7. Otherwise assign topic "General".
```

### Feedback Quality Scoring

```text
Input: rating and feedback type
1. Convert customer rating to 0-100 score using rating * 20.
2. If agent accepted the response, add positive action adjustment.
3. If agent rejected the response, apply negative action adjustment.
4. Clamp final score between 0 and 100.
5. Store score as quality_score.
```

### Analytics Calculation

```text
Input: persisted conversations and feedback records
1. Count total conversations.
2. Calculate average customer rating.
3. Calculate average quality score.
4. Calculate acceptance rate from accepted agent actions.
5. Calculate correction rate from edited agent actions.
6. Group conversations by topic.
7. Return summary metrics to dashboard.
```
