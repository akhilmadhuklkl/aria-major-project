# ARIA Interim Demo Readiness

## Submission Milestone

Interim report and presentation date: 19 June 2026.

This version is ready to demonstrate the planned high-level design, implemented prototype, backend integration, database persistence, and AI integration pathway.

## Demo Flow

1. Start the project with `npm run dev`.
2. Open the frontend at `http://localhost:5173`.
3. Confirm the backend at `http://localhost:8787/api/health`.
4. Show the Agent Workspace:
   - AI response suggestion
   - Confidence score
   - Business sources
   - Accept, edit, regenerate, and reject feedback actions
5. Show the Customer Chat:
   - Send a refund, password, delivery, or product question
   - Explain that the frontend calls the Express API
   - Explain that the response is saved to SQLite
6. Submit a customer rating.
7. Open Analytics:
   - Show conversation count
   - Show average rating
   - Show quality score
   - Show acceptance and correction rates
8. Open Business Knowledge:
   - Show indexed policies and FAQs
   - Add one new knowledge note
   - Explain that future responses can retrieve matching knowledge

## Completed for Interim

- React and TypeScript frontend with four working modules.
- Express backend API connected to the frontend.
- SQLite database persistence for conversations, messages, feedback, and knowledge.
- Database-backed knowledge retrieval for agent responses.
- Customer feedback and agent action feedback capture.
- Analytics generated from stored records.
- Mastra-compatible integration boundary through `MASTRA_AGENT_URL`.
- Architecture, database schema, screenshots, and progress notes available for report writing.

## Mastra Integration Status

Mastra is included as the AI orchestration plan and integration point. The current interim-safe implementation keeps a local knowledge-backed fallback so the demo works without provider API keys.

For the final version:

1. Run `npx mastra@latest init`.
2. Add the Express server adapter with `npm install @mastra/express@latest`.
3. Create an ARIA support agent in the Mastra project.
4. Expose the Mastra agent endpoint.
5. Set `MASTRA_AGENT_URL` in the backend environment.
6. Keep the same React frontend and `/api/chat` endpoint.

## Final Project Pending Work

- Full Mastra Studio setup with a live LLM provider.
- Semantic vector retrieval instead of keyword retrieval.
- Long-term conversation memory.
- Authentication and deployment.
- Extended testing and final report writing.
