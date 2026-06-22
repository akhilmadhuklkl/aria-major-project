# ARIA Final Demo Script

Project: Adaptive Response Intelligence Assistant  
Purpose: Final major project demonstration

## Demo Goal

Demonstrate that ARIA is a working AI-assisted customer support system that can answer customer questions using verified knowledge, collect feedback, support agent review actions, persist data, and show analytics.

## Demo Flow

| Step | Screen / Action | What To Say |
|---|---|---|
| 1 | Open ARIA application | "This is ARIA, an Adaptive Response Intelligence Assistant for customer support optimization." |
| 2 | Show Agent Workspace | "The agent workspace helps support staff review AI-generated suggestions and manage customer conversations." |
| 3 | Show Customer Chat | "Customers can ask support questions directly through the chat interface." |
| 4 | Ask refund question | "ARIA retrieves matching business knowledge and generates a grounded answer using Mastra and Gemini." |
| 5 | Show source labels | "The response includes sources so the answer is traceable to verified support knowledge." |
| 6 | Submit customer rating | "Customer feedback is stored as a quality signal for response evaluation." |
| 7 | Return to Agent Workspace | "The support agent can accept, edit, or reject AI suggestions." |
| 8 | Accept or edit a response | "Agent actions are saved as part of the feedback learning loop." |
| 9 | Open Knowledge Base | "The knowledge base stores policies, procedures, and FAQs used to ground responses." |
| 10 | Add or show knowledge record | "New business knowledge can be added and used by future AI responses." |
| 11 | Open Analytics | "Analytics are calculated from persisted conversations and feedback records." |
| 12 | Show backend health if needed | "The backend confirms SQLite persistence and Gemini/Mastra integration." |

## Recommended Live Demo Path

Use this order for the final presentation:

1. Start on the Agent Workspace to introduce the support-agent use case.
2. Move to Customer Chat and ask: `How long does my approved refund take?`
3. Point out that the answer is generated through Mastra/Gemini and grounded using the refund policy.
4. Submit a 5-star rating to show customer feedback capture.
5. Return to Agent Workspace and accept the latest response to show human review.
6. Open Knowledge Base and show the 10 support knowledge records.
7. Open Analytics and show that conversations, feedback, quality, and acceptance metrics are calculated from stored data.
8. Mention that SQLite persists the records and the backend health endpoint confirms Gemini/Mastra configuration.

## Recommended Demo Questions

| Topic | Question | Expected Result |
|---|---|---|
| Refund | How long does my approved refund take? | 5-7 business days and escalation after delay |
| Password | I am locked out and cannot reset my password. | Reset/recovery guidance |
| Delivery | Can I change the delivery address after placing my order? | Ask for order number and updated address |
| Damaged product | My product arrived damaged. What should I send? | Ask for order number, photos, packaging, delivery date |
| Subscription | Can I cancel my subscription before renewal? | Confirm cancellation before renewal |
| Payment | My payment failed but my bank shows a charge. | Ask about order creation and escalate if needed |
| Privacy | Can you share my saved card details? | Refuse to expose sensitive payment details |
| Loyalty | My loyalty points are missing from my latest order. | Ask for order/account/purchase details |

## Important Points To Explain

- The frontend is built using React and TypeScript.
- The backend is built using Express.
- SQLite stores conversations, messages, feedback, and knowledge records.
- Mastra is used as the AI orchestration layer.
- Gemini is used as the live LLM provider.
- Retrieved knowledge is passed into the AI prompt to keep answers grounded.
- Customer ratings and agent actions become learning signals.
- Analytics show response quality and support performance.

## Fallback Explanation

If live AI is unavailable, ARIA still has a local knowledge-backed fallback response system. This keeps the demo stable and shows fault tolerance.

## Latest Validation Snapshot

As of 21 June 2026, 6:23 PM:

- Backend health, Gemini configuration, and Mastra remote routing passed.
- 10 demo-ready knowledge records are available.
- 8 of 8 AI prompt tests returned the expected knowledge source.
- Feedback and agent action storage passed.
- Analytics updated from persisted SQLite records after a live chat, rating, and accepted agent action.
- Frontend served successfully at `http://localhost:5173`.
- Browser smoke test confirmed Agent Workspace, Customer Chat, Knowledge, and Analytics sections are visible with no console errors.
- Build and lint passed.
- Local `.env` remains ignored by Git, protecting the Gemini API key.

## EOD Validation Notes

Use these points if asked what was completed in the latest work session:

- Live Gemini/Mastra chat was tested across refund, password, delivery, damaged product, subscription, payment, privacy, and loyalty scenarios.
- The privacy scenario correctly refused to expose saved card details.
- The damaged product workflow created a new conversation and stored feedback plus agent acceptance.
- Analytics changed after the workflow, proving database-backed metrics.
- Production build and lint passed after the latest changes.

## Closing Statement

"ARIA demonstrates how AI can support customer service teams by generating fast, context-aware responses, preserving human review, collecting feedback, and improving support visibility through analytics."
