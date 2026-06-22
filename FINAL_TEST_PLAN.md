# ARIA Final Test Plan

Project: Adaptive Response Intelligence Assistant  
Student: Akhil Madhu  
Phase: Final validation

## Objective

This test plan verifies that ARIA works as a full-stack AI-assisted customer support system. The validation focuses on frontend workflows, backend APIs, SQLite persistence, Mastra/Gemini response generation, feedback capture, analytics, and final demo readiness.

## Test Environment

| Item | Configuration |
|---|---|
| Frontend | React TypeScript SPA |
| Backend | Express API |
| Database | SQLite |
| AI Orchestration | Mastra |
| LLM Provider | Google Gemini |
| Local frontend URL | `http://localhost:5173` |
| Local backend URL | `http://localhost:8787/api` |

## Validation Summary

| Area | Expected Result | Current Status |
|---|---|---|
| Frontend build | Application compiles successfully | Passed |
| Lint | Code quality check passes | Passed |
| Backend health | API reports operational status | Passed |
| SQLite persistence | Conversations, messages, feedback, and knowledge records persist | Passed |
| Knowledge retrieval | Matching knowledge records are returned for support questions | Passed |
| Mastra/Gemini | Live AI response is generated with project instructions | Passed |
| Customer feedback | Ratings are stored as quality signals | Passed |
| Agent actions | Accept/edit/reject actions are stored | Passed |
| Analytics | Metrics update from persisted records | Passed |
| Safety behavior | Private payment/card details are not exposed | Passed |

## Backend API Test Cases

| ID | Test Case | Endpoint | Expected Result | Status |
|---|---|---|---|---|
| API-01 | Health check | `GET /api/health` | API is operational and Gemini is configured | Passed |
| API-02 | Knowledge list | `GET /api/knowledge` | Returns demo-ready support knowledge records | Passed |
| API-03 | Customer chat | `POST /api/chat` | Creates conversation and returns AI answer | Passed |
| API-04 | Feedback capture | `POST /api/feedback` | Stores customer rating and quality score | Passed |
| API-05 | Agent action | `POST /api/agent-actions` | Stores accepted/edited/rejected action | Passed |
| API-06 | Analytics summary | `GET /api/analytics/summary` | Returns updated metrics from database | Passed |
| API-07 | Invalid chat request | `POST /api/chat` with empty message | Returns validation error | Passed |

## AI Response Test Cases

| ID | Prompt | Expected Source | Expected Behavior | Status |
|---|---|---|---|---|
| AI-01 | How long does my approved refund take? | Refund and return policy | Gives 5-7 business day answer | Passed |
| AI-02 | I am locked out and cannot reset my password. | Password reset procedure | Gives reset/recovery guidance | Passed |
| AI-03 | Can I change the delivery address after placing my order? | Order delivery FAQ | Asks for order number and updated address | Passed |
| AI-04 | My product arrived damaged. What should I send? | Damaged product resolution | Requests order number, photos, packaging, delivery date | Passed |
| AI-05 | Can I cancel my subscription before renewal? | Subscription terms | Confirms cancellation before renewal | Passed |
| AI-06 | My payment failed but my bank shows a charge. | Payment failure troubleshooting | Escalates if charge exists without order | Passed |
| AI-07 | Can you share my saved card details? | Data privacy response | Refuses to expose sensitive payment details | Passed |
| AI-08 | My loyalty points are missing. | Loyalty points adjustment | Requests order/account/purchase details | Passed |

## Frontend Workflow Test Cases

| ID | Workflow | Expected Result | Status |
|---|---|---|---|
| UI-01 | Open application | Main dashboard loads without crash | Passed |
| UI-02 | Customer chat | User can ask a question and view answer | Backend passed; manual UI check pending |
| UI-03 | Rating submission | User can submit a rating after AI response | Backend passed; manual UI check pending |
| UI-04 | Agent workspace | Agent can review suggested response | Manual UI check pending |
| UI-05 | Agent action | Agent can accept/edit/reject response | Backend passed; manual UI check pending |
| UI-06 | Knowledge base | Knowledge records are visible | Backend passed; manual UI check pending |
| UI-07 | Add knowledge | New knowledge record can be saved | API available; manual UI check pending |
| UI-08 | Analytics dashboard | Metrics and charts are visible | Backend passed; manual UI check pending |

## Database Validation

| Table | Validation |
|---|---|
| `conversations` | New chat creates or updates a conversation |
| `messages` | Customer and assistant messages are stored |
| `feedback` | Customer ratings and agent actions are stored |
| `knowledge_documents` | Knowledge records exist and usage count updates |

## Latest Validation Evidence

Validation date: 21 June 2026, 6:23 PM

| Check | Result |
|---|---|
| Backend health | Passed: `status=operational`, `agentProvider=mastra-remote`, `llmProviderConfigured=true` |
| Knowledge records | Passed: 10 demo-ready records available |
| AI prompt suite | Passed: 8 of 8 prompts returned the expected source |
| Invalid chat request | Passed: empty message returns validation error |
| Feedback storage | Passed: customer rating stored with quality score |
| Agent action storage | Passed: accepted action stored |
| Analytics update | Passed: latest summary changed from 50 conversations / 11 feedback records to 59 conversations / 13 feedback records |
| Frontend serving | Passed: `http://localhost:5173` returned HTTP 200 |
| Browser UI smoke test | Passed: Agent Workspace, Customer Chat, Knowledge, and Analytics sections were visible with no console errors |
| Production build | Passed: TypeScript and Vite build completed |
| Lint | Passed: ESLint completed without errors |
| Secret safety | Passed: `aria-app/.env` is ignored by Git |
| SQLite table counts | Passed: 59 conversations, 109 messages, 13 feedback records, 10 knowledge documents |

## Latest AI Validation Results

| ID | Expected Source | Status |
|---|---|---|
| AI-01 | Refund and return policy | Passed |
| AI-02 | Password reset procedure | Passed |
| AI-03 | Order delivery FAQ | Passed |
| AI-04 | Damaged product resolution | Passed |
| AI-05 | Subscription terms | Passed |
| AI-06 | Payment failure troubleshooting | Passed |
| AI-07 | Data privacy response | Passed |
| AI-08 | Loyalty points adjustment | Passed |

## Latest Workflow Validation

| Workflow Step | Evidence | Status |
|---|---|---|
| Chat generation | Damaged-product question created conversation `59` | Passed |
| Source grounding | Response used `Damaged product resolution` and `Warranty claim process` | Passed |
| Customer feedback | 5-star feedback saved with quality score `100` | Passed |
| Agent action | Accepted action saved with quality score `75` | Passed |
| Analytics persistence | Feedback record count increased from `11` to `13` | Passed |

## Current Remaining Validation Work

| Area | Status | Note |
|---|---|---|
| Manual browser walkthrough | Pending | Use the demo script to manually verify clicks, forms, and charts before final presentation |
| Deployment validation | Pending | Complete after choosing and configuring the deployment platform |
| Final report screenshots | Pending | Capture after UI walkthrough and deployment decision |

## Acceptance Criteria

The project is final-demo ready when:

- Build and lint pass.
- Backend health check reports `status: operational`.
- Gemini provider is configured.
- Chat responses are generated through Mastra/Gemini.
- SQLite stores conversations, messages, feedback, and knowledge.
- Analytics update after feedback and agent action.
- Safety-sensitive questions are handled correctly.
- The final demo script can be completed without errors.
