# ARIA Major Project Plan

ARIA means Adaptive Response Intelligence Assistant. The project goal is to build an AI-powered customer support assistant that helps users and support agents, learns from ratings and agent corrections, remembers useful business context, and shows analytics about response quality over time.

## 1. What The Proposal Requires

The PDF describes a business-focused chatbot system, not a generic casual chatbot. The important deliverables are:

- React-based chat UI for customer and agent interactions.
- LLM-powered response generation.
- Agent-assist mode where the AI suggests replies to a human support agent.
- Feedback learning system using ratings, comments, and edited/corrected answers.
- Semantic memory layer for recalling business policies, FAQs, product documents, and past conversations.
- Analytics dashboard for customer satisfaction, quality scores, improvement trends, and agent performance.
- Cloud-ready deployment using tools such as Vercel, Docker, and a database.

The architecture diagrams show this flow:

1. User submits a support query through the React chat UI.
2. API gateway sends the request to the AI processing backend.
3. Agent service retrieves relevant context from the memory and context layer.
4. LLM generates a response using retrieved context.
5. Response is displayed to the customer or suggested to a support agent.
6. Customer or agent submits explicit feedback.
7. Feedback service and scoring engine update logs, scores, and context weights.
8. Later responses improve because retrieval and scoring use the updated context.

## 2. Recommended Final System Scope

Build the project as a full-stack web application with four major user-facing areas:

1. Customer Chat
   - Customer asks support questions.
   - AI answers using business knowledge.
   - Customer can rate the answer and leave a comment.

2. Agent Workspace
   - Agent sees incoming customer query.
   - AI generates a suggested response.
   - Agent can accept, edit, regenerate, or reject the suggestion.
   - Agent edits are stored as learning signals.

3. Knowledge Base Admin
   - Add, edit, and manage FAQs, policies, procedures, and product documents.
   - Convert knowledge records into embeddings for semantic search.

4. Analytics Dashboard
   - Show total conversations, average rating, response quality trend, correction rate, most common topics, unresolved queries, and agent performance.

## 3. Recommended Technology Stack

Use one practical, coherent stack instead of mixing too many technologies.

Frontend:

- React
- TypeScript
- Tailwind CSS
- Recharts for charts
- Vite or Next.js

Backend:

- Node.js with TypeScript
- Express, Fastify, or Next.js API routes
- Optional: Mastra AI Agent if you want the architecture to match the proposal diagrams closely

Database:

- PostgreSQL is recommended because it can store structured app data and vector embeddings using pgvector.
- MongoDB is acceptable, but PostgreSQL is cleaner for analytics, joins, ratings, and reporting.

AI:

- OpenAI API or Gemini API for response generation.
- Embeddings for semantic search.
- A mock LLM mode should be added early so development can continue even without API credits.

Deployment:

- Vercel for frontend and serverless APIs, or Render/Railway for a persistent backend.
- Supabase or Neon for hosted PostgreSQL.
- GitHub for version control.

## 4. Core Data Model

Start with these entities.

### User

- id
- name
- email
- role: customer, agent, admin
- createdAt

### Conversation

- id
- customerId
- assignedAgentId
- status: open, pending, resolved
- topic
- createdAt
- updatedAt

### Message

- id
- conversationId
- senderType: customer, agent, ai
- content
- createdAt

### KnowledgeDocument

- id
- title
- category
- content
- sourceType: faq, policy, product_doc, procedure
- active
- createdAt
- updatedAt

### KnowledgeEmbedding

- id
- documentId
- chunkText
- embedding
- weight
- createdAt

### AIResponse

- id
- conversationId
- queryMessageId
- responseText
- retrievedContext
- modelName
- confidenceScore
- createdAt

### Feedback

- id
- aiResponseId
- userId
- rating
- comment
- agentEditedResponse
- feedbackType: customer_rating, agent_edit, rejection, acceptance
- createdAt

### QualityScore

- id
- aiResponseId
- feedbackId
- score
- reason
- createdAt

## 5. Backend API Plan

Minimum APIs:

- `POST /api/chat`
  - Input: conversationId, message
  - Output: AI response or agent suggestion

- `GET /api/conversations`
  - List conversations for customer or agent.

- `GET /api/conversations/:id`
  - Load conversation messages.

- `POST /api/feedback`
  - Save rating, comment, edited response, or accept/reject signal.

- `POST /api/knowledge`
  - Add FAQ, policy, or document content.

- `GET /api/knowledge`
  - List knowledge base records.

- `POST /api/knowledge/:id/embed`
  - Generate embeddings for a knowledge record.

- `GET /api/analytics/summary`
  - Summary metrics.

- `GET /api/analytics/trends`
  - Rating and quality trends over time.

## 6. AI Response Workflow

For each customer query:

1. Save the customer message.
2. Create an embedding for the query.
3. Retrieve the most relevant knowledge chunks from the vector store.
4. Retrieve recent conversation messages.
5. Build a prompt with:
   - System role: business support assistant.
   - Business rules.
   - Retrieved knowledge.
   - Conversation history.
   - User question.
6. Ask the LLM to generate a response.
7. Save the response, model name, retrieved context, and confidence metadata.
8. Return the response to UI.

The assistant should be instructed to:

- Answer only from known business context when possible.
- Ask for missing details when needed.
- Avoid inventing policies.
- Escalate to a human agent when confidence is low.
- Keep tone professional and customer-friendly.

## 7. Feedback Learning Logic

The project does not need true model fine-tuning to demonstrate adaptive learning. For an academic major project, the best approach is retrieval adaptation.

Use feedback to improve:

- Context weights.
- Knowledge chunk priority.
- Prompt examples.
- Response quality scoring.
- Analytics.

Example scoring rules:

- 5-star customer rating: positive signal.
- 1-2 star rating: negative signal.
- Agent accepted response without edit: positive signal.
- Agent edited response heavily: negative or improvement signal.
- Agent rejected response: negative signal.

Simple score formula:

```text
qualityScore = ratingScore + agentActionScore + correctionSimilarityScore
```

Where:

- ratingScore converts 1-5 stars into 0-100.
- agentActionScore rewards accepted answers and penalizes rejected answers.
- correctionSimilarityScore compares original AI answer with agent edited answer. A large edit means the AI response needed more correction.

This makes the system "adaptive" because future retrieval and dashboard metrics change based on feedback.

## 8. Frontend Screens

### Customer Chat Screen

Must include:

- Chat message list.
- Input box.
- Send button.
- Typing/loading state.
- AI response bubble.
- Rating control.
- Optional comment box.
- Submit feedback button.

### Agent Workspace

Must include:

- Conversation queue.
- Selected conversation view.
- Customer message history.
- AI suggested reply.
- Edit box for agent correction.
- Accept, edit/send, regenerate, reject buttons.
- Feedback/correction status.

### Knowledge Base Admin

Must include:

- Table/list of knowledge records.
- Add/edit form.
- Category selector.
- Active/inactive status.
- Embed/re-index action.

### Analytics Dashboard

Must include:

- Total conversations.
- Average customer rating.
- Average AI quality score.
- Agent correction rate.
- Response acceptance rate.
- Trend chart over time.
- Top low-rated topics.
- Recent negative feedback list.

## 9. Development Milestones

### Week 1-2: Requirement Finalization

Tasks:

- Convert proposal into a formal Software Requirements Specification.
- Define user roles: customer, agent, admin.
- Finalize whether backend will use Node/TypeScript or Python.
- Decide database: PostgreSQL is recommended.
- Prepare sample business domain, such as ecommerce support, banking support, college helpdesk, or SaaS product support.

Deliverables:

- SRS document.
- Use case diagram.
- Final tech stack.
- Sample FAQ and policy dataset.

### Week 3: Architecture And Database Design

Tasks:

- Draw system architecture.
- Design database schema.
- Prepare API specification.
- Create wireframes for UI screens.

Deliverables:

- ER diagram.
- API contract.
- Updated sequence diagrams.
- UI wireframes.

### Week 4: React UI Development

Tasks:

- Create frontend project.
- Build customer chat page.
- Build agent workspace page.
- Build basic dashboard layout.
- Use mock API data first.

Deliverables:

- Working SPA with navigation.
- Mock chat interactions.
- Feedback UI controls.

### Week 5: Backend And LLM Integration

Tasks:

- Create backend API.
- Connect database.
- Implement chat endpoint.
- Add LLM provider wrapper.
- Add mock provider fallback.

Deliverables:

- Functional chat API.
- AI response generation.
- Saved conversations and messages.

### Week 6-7: Semantic Memory And Feedback

Tasks:

- Add knowledge base CRUD.
- Chunk knowledge documents.
- Generate and store embeddings.
- Implement semantic search.
- Implement feedback endpoint.
- Implement quality scoring.

Deliverables:

- Knowledge-based AI answers.
- Feedback records.
- Updated context weights.

### Week 8: Agent Assist Mode

Tasks:

- Show AI suggestions to support agents.
- Allow editing before sending.
- Store edited response as correction.
- Track accept/edit/reject actions.

Deliverables:

- Agent-assist workflow.
- Human-in-the-loop learning records.

### Week 9: Analytics Dashboard

Tasks:

- Build metrics API.
- Build trend charts.
- Show satisfaction and correction rate.
- Show low-performing topics.

Deliverables:

- Working dashboard with real project data.

### Week 10: Integration And Testing

Tasks:

- Test complete customer flow.
- Test complete agent flow.
- Test feedback and scoring.
- Test knowledge retrieval.
- Fix UI, backend, and database bugs.

Deliverables:

- Test report.
- Stable integrated application.

### Week 11-12: Documentation And Presentation

Tasks:

- Complete final report.
- Prepare screenshots.
- Prepare architecture diagrams.
- Prepare demo script.
- Create final presentation slides.

Deliverables:

- Final report.
- PPT.
- Demo video or live demo.
- GitHub repository.

## 10. Minimum Viable Product

If time becomes limited, the MVP should include:

- Customer chat UI.
- Backend chat API.
- LLM response generation.
- Knowledge base retrieval.
- Rating feedback.
- Basic analytics dashboard.

Agent-assist edits and advanced scoring can be added after the MVP works.

## 11. Testing Checklist

Functional tests:

- User can start a conversation.
- User can send a message.
- AI response is generated.
- Knowledge context is retrieved.
- Feedback can be submitted.
- Agent can edit AI suggestion.
- Dashboard updates after feedback.

AI behavior tests:

- AI answers known FAQ correctly.
- AI asks for clarification when user query is vague.
- AI refuses to invent policy details.
- AI escalates when answer is not available.

Database tests:

- Messages are saved correctly.
- Feedback links to the correct AI response.
- Embeddings link to the correct knowledge document.
- Analytics queries return correct totals.

UI tests:

- Chat works on desktop and mobile.
- Loading states are visible.
- Long messages do not break layout.
- Rating controls are easy to use.

## 12. Final Report Structure

Suggested chapters:

1. Introduction
2. Problem Statement
3. Objectives
4. Literature/Technology Review
5. Requirement Analysis
6. System Design
7. Implementation
8. Testing
9. Results And Discussion
10. Conclusion
11. Future Scope
12. References
13. Appendix

Important screenshots to include:

- Customer chat screen.
- Agent workspace.
- Knowledge base page.
- Feedback submission.
- Analytics dashboard.
- Database records.
- Deployment page.

## 13. Future Enhancements

Good future scope items:

- CRM integration.
- Ticket creation automation.
- Multilingual support.
- Voice support.
- Fine-tuned model or evaluation dataset.
- Advanced role-based access control.
- Email/chat channel integration.
- Automated escalation rules.

## 14. Immediate Next Steps

Start with these:

1. Choose the business domain for the demo knowledge base.
2. Finalize the stack: React + TypeScript + Tailwind + Node.js + PostgreSQL is recommended.
3. Create the app scaffold.
4. Add sample FAQ/policy data.
5. Build the customer chat UI with mock responses.
6. Add backend persistence.
7. Add LLM integration.
8. Add feedback and analytics.

