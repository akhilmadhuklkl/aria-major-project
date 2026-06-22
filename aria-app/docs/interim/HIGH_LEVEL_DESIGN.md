# ARIA High-Level Design

## System Overview

ARIA is designed as an adaptive customer-support assistant. The frontend gives support agents and customers a usable interface, while the backend stores conversations, retrieves business knowledge, generates AI-assisted responses, records feedback, and computes analytics.

## Architecture Diagram

```mermaid
flowchart LR
  Customer["Customer Chat UI"] --> React["React Frontend"]
  Agent["Support Agent Workspace"] --> React
  React --> API["Express API"]
  API --> AgentService["AgentService Boundary"]
  AgentService --> Local["Local Knowledge Agent"]
  AgentService -. final phase .-> Mastra["Mastra AI Agent"]
  API --> SQLite["SQLite Database"]
  SQLite --> Knowledge["Knowledge Documents"]
  SQLite --> Feedback["Feedback Records"]
  SQLite --> Analytics["Analytics Summary"]
```

## Use Case Diagram

```mermaid
flowchart LR
  Customer["Customer"] --> Ask["Ask support question"]
  Customer --> Rate["Rate AI response"]
  SupportAgent["Support Agent"] --> Review["Review suggested response"]
  SupportAgent --> Accept["Accept/Edit/Reject response"]
  Admin["Admin"] --> Manage["Manage business knowledge"]
  System["ARIA System"] --> Generate["Generate grounded response"]
  System --> Store["Store conversation and feedback"]
  System --> Report["Show analytics"]
```

## Sequence Diagram

```mermaid
sequenceDiagram
  participant C as Customer
  participant UI as React Frontend
  participant API as Express API
  participant DB as SQLite
  participant AI as AgentService

  C->>UI: Enters support query
  UI->>API: POST /api/chat
  API->>DB: Save customer message
  API->>AI: Generate response
  AI->>DB: Search business knowledge
  AI-->>API: Answer, confidence, sources
  API->>DB: Save assistant message
  API-->>UI: Return AI response
  C->>UI: Submit rating
  UI->>API: POST /api/feedback
  API->>DB: Save feedback score
```

## ER Diagram

```mermaid
erDiagram
  CONVERSATIONS ||--o{ MESSAGES : contains
  CONVERSATIONS ||--o{ FEEDBACK : receives
  MESSAGES ||--o{ FEEDBACK : evaluated_by

  CONVERSATIONS {
    int id
    string customer_name
    string subject
    string status
    string priority
    string topic
    string created_at
    string updated_at
  }

  MESSAGES {
    string id
    int conversation_id
    string role
    string content
    float confidence
    string sources
    int should_escalate
    string created_at
  }

  FEEDBACK {
    string id
    string message_id
    int conversation_id
    int rating
    string feedback_type
    string comment
    string edited_response
    float quality_score
    string created_at
  }

  KNOWLEDGE_DOCUMENTS {
    int id
    string title
    string category
    string content
    string status
    int uses
    string updated_at
  }
```

## Module Decomposition

- Frontend shell: navigation, top bar, and view routing.
- Agent workspace: conversation queue, AI suggestion panel, and agent feedback actions.
- Customer chat: customer query input, AI response rendering, and rating capture.
- Knowledge base: indexed business documents and create-knowledge workflow.
- Analytics: conversation count, rating, quality, acceptance, correction, and topic metrics.
- Express API: REST endpoints for chat, feedback, knowledge, analytics, and health.
- Database layer: SQLite schema, seed data, retrieval helpers, and quality scoring.
- AI service layer: local knowledge-backed fallback and Mastra-compatible remote adapter.

## Core Algorithms

### Topic Inference

1. Convert the customer message to lowercase.
2. Check for known support keywords such as refund, password, delivery, product, and billing.
3. Assign a topic label.
4. Store the topic against the conversation for analytics.

### Knowledge Retrieval

1. Tokenize the customer query into searchable terms.
2. Compare terms against each knowledge document title, category, and content.
3. Apply higher scores for title matches, medium scores for category matches, and lower scores for content matches.
4. Return the top matching documents.
5. Attach retrieved document titles as response sources.

### Quality Scoring

1. Convert customer rating to a 0-100 score.
2. Add a positive adjustment for accepted responses.
3. Add a negative adjustment for rejected responses.
4. Clamp the final score between 0 and 100.
5. Use average quality score in analytics.
