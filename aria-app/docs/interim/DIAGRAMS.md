# ARIA Interim Diagrams

These diagrams can be copied into the interim report or converted into images.

## High-Level Architecture

```mermaid
flowchart LR
  customer["Customer"]
  agent["Support Agent"]
  ui["React + TypeScript SPA"]
  api["Express API Gateway"]
  agentService["AgentService Interface"]
  localAgent["Local Knowledge Agent"]
  mastra["Mastra AI Agent Endpoint"]
  db["SQLite Database"]
  knowledge["Knowledge Documents"]
  analytics["Analytics Dashboard"]

  customer --> ui
  agent --> ui
  ui --> api
  api --> agentService
  agentService --> localAgent
  agentService -. final phase .-> mastra
  api --> db
  db --> knowledge
  db --> analytics
  analytics --> ui
```

## Use Case Diagram

```mermaid
flowchart TB
  customer["Customer"]
  supportAgent["Support Agent"]
  admin["Admin / Project Owner"]

  uc1["Ask support question"]
  uc2["Receive AI response"]
  uc3["Rate response"]
  uc4["Review AI suggestion"]
  uc5["Edit and send response"]
  uc6["Accept or reject suggestion"]
  uc7["Manage knowledge base"]
  uc8["View support analytics"]
  uc9["Monitor adaptive quality score"]

  customer --> uc1
  customer --> uc2
  customer --> uc3
  supportAgent --> uc4
  supportAgent --> uc5
  supportAgent --> uc6
  supportAgent --> uc8
  admin --> uc7
  admin --> uc8
  admin --> uc9
```

## Customer Chat Sequence

```mermaid
sequenceDiagram
  actor Customer
  participant UI as React Customer Chat
  participant API as Express API
  participant Agent as ARIA AgentService
  participant DB as SQLite Database
  participant Analytics as Analytics Service

  Customer->>UI: Submit support question
  UI->>API: POST /api/chat
  API->>DB: Save customer message
  API->>Agent: Generate support response
  Agent->>DB: Retrieve matching knowledge
  Agent-->>API: Response, confidence, sources
  API->>DB: Save AI response
  API-->>UI: Return response
  UI-->>Customer: Display response
  Customer->>UI: Submit rating
  UI->>API: POST /api/feedback
  API->>DB: Save feedback and quality score
  UI->>API: GET /api/analytics/summary
  API-->>UI: Updated dashboard values
```

## Agent-Assist Feedback Sequence

```mermaid
sequenceDiagram
  actor Agent as Support Agent
  participant UI as React Agent Workspace
  participant API as Express API
  participant DB as SQLite Database
  participant Scoring as Quality Scoring Logic

  Agent->>UI: Review suggested response
  Agent->>UI: Accept / Edit / Reject
  UI->>API: POST /api/agent-actions
  API->>DB: Find latest AI response
  API->>Scoring: Calculate action score
  Scoring-->>API: Quality score
  API->>DB: Save feedback record
  API-->>UI: Confirm action
  UI->>API: GET /api/analytics/summary
  API-->>UI: Updated acceptance/correction metrics
```

## ER Diagram

```mermaid
erDiagram
  CONVERSATIONS ||--o{ MESSAGES : contains
  CONVERSATIONS ||--o{ FEEDBACK : receives
  MESSAGES ||--o{ FEEDBACK : evaluated_by

  CONVERSATIONS {
    integer id PK
    string customer_name
    string subject
    string status
    string priority
    string topic
    string created_at
    string updated_at
  }

  MESSAGES {
    string id PK
    integer conversation_id FK
    string role
    string content
    float confidence
    string sources
    integer should_escalate
    string created_at
  }

  FEEDBACK {
    string id PK
    string message_id FK
    integer conversation_id FK
    integer rating
    string feedback_type
    string comment
    string edited_response
    float quality_score
    string created_at
  }

  KNOWLEDGE_DOCUMENTS {
    integer id PK
    string title
    string category
    string content
    string status
    integer uses
    string updated_at
  }
```

## Module Decomposition

```mermaid
flowchart TB
  app["ARIA System"]
  app --> frontend["Frontend SPA"]
  app --> backend["Backend API"]
  app --> ai["AI Agent Layer"]
  app --> storage["Database Layer"]
  app --> analytics["Analytics Layer"]

  frontend --> customerChat["Customer Chat"]
  frontend --> agentWorkspace["Agent Workspace"]
  frontend --> knowledgeUi["Knowledge UI"]
  frontend --> dashboard["Analytics Dashboard"]

  backend --> chatApi["Chat API"]
  backend --> feedbackApi["Feedback API"]
  backend --> knowledgeApi["Knowledge API"]
  backend --> analyticsApi["Analytics API"]

  ai --> localService["LocalAgentService"]
  ai --> mastraRemote["RemoteMastraAgentService"]

  storage --> conversations["Conversations"]
  storage --> messages["Messages"]
  storage --> feedback["Feedback"]
  storage --> documents["Knowledge Documents"]
```
