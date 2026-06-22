# ARIA Interim Demo Script

## Opening Statement

ARIA is an Adaptive Response Intelligence Assistant for customer support
optimization. The project focuses on improving support response quality, reducing
agent effort, and learning from customer ratings and agent corrections.

## Demo Steps

### 1. Show Agent Workspace

Say:

> This is the support agent workspace. It contains the conversation queue, selected
> customer conversation, and ARIA's AI suggested response panel.

Show:

- Conversation list
- Chat history
- Suggested response
- Confidence
- Sources used
- Accept, Edit and send, Regenerate, Reject buttons

### 2. Show Customer Chat

Say:

> This screen represents the customer-facing chat interface. The customer asks a
> support question, and the frontend sends it to the backend API.

Action:

- Open Customer Chat.
- Type: `How long does my refund take?`
- Send the message.

Say:

> The backend saves the customer message, calls the current AgentService, stores
> the AI response, and returns it to the frontend.

### 3. Submit Feedback

Action:

- Select 5 stars.
- Click Submit.

Say:

> Customer feedback is stored in the database and converted into a quality score.
> This is the first part of the adaptive learning loop.

### 4. Show Analytics

Action:

- Open Analytics.

Say:

> These dashboard values are calculated from persisted conversations and feedback,
> not only from static mock data.

Show:

- Conversation count
- Average rating
- Quality score
- Acceptance rate
- Topic distribution

### 5. Show Agent Feedback

Action:

- Return to Agent Workspace.
- Click Accept or Reject on the AI suggestion.
- Return to Analytics.

Say:

> Agent actions are stored as feedback records. This allows ARIA to learn not only
> from customers but also from human support-agent corrections.

## Current Implementation Statement

Say:

> For the interim stage, the system uses a mock AgentService so the full workflow
> can run without external API dependency. The backend has been designed so that
> this service can be replaced by Mastra AI in the final implementation phase.

## Closing Statement

Say:

> The current prototype demonstrates the core project architecture: customer chat,
> agent assist, feedback learning, persistent storage, and analytics. The next
> phase will focus on Mastra AI integration, semantic knowledge retrieval, and
> final testing.
