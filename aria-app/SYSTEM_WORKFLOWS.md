# ARIA System Workflows

This document explains the main operational workflows of ARIA, the Adaptive Response Intelligence Assistant. It describes how the React frontend, Express backend, SQLite database, semantic retrieval layer, feedback loop, analytics module, and Mastra/Gemini integration work together.

## 1. High-Level Workflow

ARIA follows a full-stack client-server workflow. The frontend does not call AI providers or the database directly. All business logic, persistence, retrieval, feedback storage, and AI response generation are handled through the backend API.

```text
Customer / Support Agent
        |
        v
React + TypeScript Frontend
        |
        v
Express Backend API
        |
        +--> SQLite Database
        |
        +--> Semantic Retrieval Layer
        |          |
        |          v
        |      SQLite Knowledge + Embeddings
        |
        +--> AI Agent Service
        |          |
        |          +--> Mastra Cloud Endpoint --> Google Gemini Model
        |          |
        |          `--> Local Knowledge Fallback
        |
        `--> Analytics Service --> SQLite Database
```

This design keeps the application stable during demo because the UI depends only on the Express API contract. If the remote AI provider is unavailable, the backend can still return a grounded local fallback response.

## 2. Customer Chat Workflow

The Customer Chat module allows a user to submit a support question and receive a grounded AI-assisted response. The response includes confidence, retrieval method, provider information, and source evidence.

```text
Customer
   |
   v
Customer Chat UI
   |
   |  POST /api/chat
   v
Express Backend API
   |
   +--> Create/update conversation in SQLite
   |
   +--> Store customer message in SQLite
   |
   +--> Search matching knowledge records
   |        |
   |        v
   |    Read knowledge records and embeddings
   |
   +--> Generate answer using retrieved context
   |        |
   |        +--> Mastra/Gemini when configured
   |        |
   |        `--> Local fallback when needed
   |
   +--> Store assistant response in SQLite
   |
   v
Return response, confidence, retrieval method, provider, and sources
```

| Step | Implementation |
|---|---|
| Customer submits question | Customer Chat screen |
| Frontend API call | `api.chat()` |
| Backend endpoint | `POST /api/chat` |
| Conversation storage | `conversations` table |
| Message storage | `messages` table |
| Knowledge grounding | Semantic retrieval with keyword fallback |
| Response metadata | Confidence, sources, retrieval method, provider |

## 3. Customer Feedback Workflow

After receiving a response, the customer can submit a rating. This rating is stored and used for analytics and learning signals.

```text
Customer selects rating
        |
        v
Submit feedback in Customer Chat
        |
        |  POST /api/feedback
        v
Store feedback in SQLite
        |
        +--> Calculate quality score
        |
        +--> Update analytics metrics
        |
        `--> Update source feedback statistics
```

| Step | Implementation |
|---|---|
| Rating selection | Feedback prompt in Customer Chat |
| Frontend API call | `api.submitFeedback()` |
| Backend endpoint | `POST /api/feedback` |
| Persistence | `feedback` table |
| Analytics effect | Updated average rating and quality metrics |

The feedback record is linked to the related conversation and assistant message, allowing ARIA to understand which answer and sources received the rating.

## 4. Agent Workspace Workflow

The Agent Workspace represents the human-in-the-loop support process. A support agent can review AI suggestions and decide whether to accept, edit, regenerate, or reject the response.

```text
Support Agent
     |
     v
Select conversation in Agent Workspace
     |
     v
Review chat history and AI suggestion
     |
     +--> Accept
     +--> Edit and send
     +--> Regenerate
     `--> Reject
     |
     |  POST /api/agent-actions
     v
Store agent action as feedback in SQLite
     |
     v
Refresh analytics summary
```

| Action | Meaning |
|---|---|
| Accept | AI suggestion is suitable for use |
| Edit and send | AI suggestion is useful but needs correction |
| Regenerate | Agent requests a new suggestion draft |
| Reject | AI suggestion is not suitable |

Agent actions are stored as learning signals. Accepted responses improve confidence, edited responses indicate partial usefulness, and rejected responses indicate that the output needs improvement.

## 5. Knowledge Base Workflow

The Knowledge Base stores verified business support information such as policies, FAQs, and procedures. These records are used to ground AI responses.

```text
Open Knowledge page
        |
        |  GET /api/knowledge
        v
Load knowledge records from SQLite
        |
        v
Display table, search, filters, and actions
        |
        +--> Add knowledge
        |        |
        |        |  POST /api/knowledge
        |        v
        |    Store new record in SQLite
        |
        +--> Delete one row
        |        |
        |        |  DELETE /api/knowledge/:id
        |        v
        |    Remove selected record from SQLite
        |
        `--> Bulk delete selected rows
                 |
                 v
             Remove selected records from SQLite
```

| Operation | Result |
|---|---|
| View records | Loads support knowledge from SQLite |
| Search/filter | Filters visible knowledge records |
| Add record | Stores new support content |
| Delete row | Removes selected knowledge record |
| Bulk delete | Removes selected set of knowledge records |

When knowledge content changes, embeddings can be refreshed with:

```bash
npm run index:knowledge
```

## 6. Semantic Retrieval Workflow

Semantic retrieval helps ARIA find relevant knowledge based on meaning instead of exact keyword matching.

```text
Customer question
        |
        v
Generate query embedding
        |
        v
Read stored knowledge embeddings
        |
        v
Calculate similarity scores
        |
        v
Rank matching sources
        |
        v
Apply bounded feedback adjustment
        |
        v
Return source snippets for response generation
```

| Area | Behavior |
|---|---|
| Embedding model | MiniLM-based Transformers.js model |
| Embedding dimensions | 384 |
| Primary retrieval | Vector similarity |
| Fallback retrieval | Keyword-based matching |
| Ranking | Similarity plus bounded feedback adjustment |
| Unrelated query handling | Escalation or safe fallback when no support source matches |

The retrieval layer improves answer quality by passing relevant verified support context into the response generation step.

## 7. AI Response Generation Workflow

ARIA supports Mastra and Gemini for live response generation while also keeping a local fallback for reliability.

```text
POST /api/chat
      |
      v
Retrieve relevant knowledge
      |
      v
Is Mastra endpoint configured?
      |
      +-- Yes --> Call Mastra-compatible endpoint
      |              |
      |              v
      |          Remote response successful?
      |              |
      |              +-- Yes --> Return Mastra/Gemini response
      |              |
      |              `-- No  --> Use local knowledge fallback
      |
      `-- No  --> Use local knowledge fallback
                     |
                     v
              Return stable grounded response
```

This workflow supports both live AI generation and dependable local demonstration. The frontend does not need to know which provider generated the response.

## 8. Feedback Learning Workflow

ARIA stores customer ratings and agent actions as feedback signals. These signals are used for analytics and for bounded source-quality adjustment.

```text
Assistant response
        |
        v
Linked knowledge sources
        |
        v
Customer rating + Agent action
        |
        v
Feedback table
        |
        v
Quality score
        |
        v
Source feedback statistics
        |
        v
Bounded ranking adjustment
        |
        v
Future source ranking
```

The feedback adjustment is intentionally bounded. It can slightly improve or reduce source ranking, but it cannot override strong semantic relevance.

## 9. Analytics Workflow

The Analytics dashboard converts stored operational records into support-performance metrics.

```text
Analytics UI
     |
     |  GET /api/analytics/summary
     v
Express Backend API
     |
     +--> Count conversations
     +--> Aggregate feedback records
     +--> Calculate quality and source metrics
     +--> Group conversations by topic
     |
     v
Return analytics summary
     |
     v
Render cards, charts, and learning panels
```

| Metric | Source |
|---|---|
| Average rating | Customer feedback |
| Response quality | Feedback quality score |
| Acceptance rate | Agent actions |
| Source quality | Feedback linked to knowledge sources |
| Topic distribution | Conversation topics |
| Learning signals | Feedback and agent action records |

## 10. Settings And Health Workflow

The Settings modal provides a quick system-readiness view during demo.

```text
Open Settings
      |
      v
Show Backend API status
      |
      v
Show SQLite status
      |
      v
Show retrieval status
      |
      v
Show Mastra/Gemini status
      |
      v
Show learning summary
```

This helps confirm that the frontend, backend, database, retrieval layer, and AI integration are connected.

## 11. Final Demo Workflow

The recommended final demonstration path is:

```text
Open ARIA
   |
   v
Show Agent Workspace
   |
   v
Open Customer Chat
   |
   v
Ask support question
   |
   v
Show AI response and source evidence
   |
   v
Submit customer rating
   |
   v
Return to Agent Workspace
   |
   v
Accept or edit AI suggestion
   |
   v
Open Knowledge Base
   |
   v
Show indexed support records
   |
   v
Open Analytics
   |
   v
Show feedback and source-quality metrics
   |
   v
Open Settings and confirm system status
```

Recommended demo question:

```text
How long does a refund take after approval?
```

Expected result:

- ARIA returns a refund-related response.
- The answer is grounded in the refund policy.
- Confidence, retrieval method, provider, and source evidence are visible.
- Customer feedback can be stored.
- Agent action can be stored.
- Analytics reflects stored records.

## 12. Validation Coverage

| Command | Purpose |
|---|---|
| `npm run lint` | Checks TypeScript and React code quality |
| `npm run build` | Verifies production build |
| `npm run validate:final` | Validates backend health, chat, feedback, agent actions, and analytics |
| `npm run evaluate:retrieval` | Tests knowledge retrieval behavior |
| `npm run evaluate:adaptation` | Tests feedback adaptation behavior |

These commands should be run before final demo rehearsal or before making a release commit.
