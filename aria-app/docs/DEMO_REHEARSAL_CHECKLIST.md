# ARIA Demo Rehearsal Checklist

Use this checklist before the internal faculty demo. Keep the flow short, confident, and predictable.

## Pre-Demo Setup

1. Start the backend and frontend using the normal development command.
2. Open the app in the browser.
3. Confirm the top status shows AI services operational.
4. Open Settings and confirm backend, SQLite, retrieval, and Mastra Cloud status are visible.
5. Keep the Mastra Platform page ready in another tab only if asked for cloud proof.

## Demo Flow

### 1. Agent Workspace

Purpose: Show the human-in-the-loop support agent workflow.

Actions to demonstrate:
- Click different conversations in the left queue.
- Show that each conversation has its own customer name, order number, and chat history.
- Use the Reply/Internal note tabs.
- Type a short reply and click Send.
- Explain that Accept, Edit & send, Regenerate, and Reject represent agent review actions.
- Click the ARIA assistant options button to show what those actions mean.

Demo line:
"This screen is used by the support agent. The agent can review the customer conversation, inspect the AI suggestion, and either accept, edit, regenerate, or reject it. These actions are stored as feedback signals for analytics."

### 2. Customer Chat

Purpose: Show the customer-facing AI response workflow.

Actions to demonstrate:
- Ask a safe query such as: `How long does a refund take after approval?`
- Wait for ARIA to return a response.
- Point out confidence, retrieval method, provider, and source evidence chips.
- Select a star rating and submit feedback.

Demo line:
"The customer receives an AI-assisted response grounded in stored business knowledge. The system also displays confidence, retrieval method, generation provider, and source evidence."

### 3. Knowledge Base

Purpose: Show verified support knowledge used by retrieval.

Actions to demonstrate:
- Search for `refund`.
- Open a row using the three-dot details button.
- Add a temporary demo record only if needed.
- Use checkbox selection and delete only a temporary record.
- Avoid deleting core sources such as Refund and return policy, Password reset procedure, or Damaged product resolution.

Demo line:
"The knowledge base stores verified policies, FAQs, and procedures. Semantic retrieval uses these records to ground AI responses and reduce unsupported answers."

### 4. Analytics

Purpose: Show feedback learning and support performance.

Actions to demonstrate:
- Show average rating, learning sources, acceptance rate, and source quality.
- Show response quality trend and top support topics.
- Click Refresh data to prove the analytics page can sync with backend data.
- Explain strong learning signals and review-needed sources.

Demo line:
"The analytics dashboard summarizes conversations, feedback, agent actions, source quality, and learning signals. This closes the feedback loop from customer response to measurable improvement."

### 5. Settings

Purpose: Show system health and integration proof.

Actions to demonstrate:
- Open Settings from the left sidebar.
- Point out backend API, SQLite database, semantic retrieval, and Mastra Cloud status.

Demo line:
"The settings view confirms that the frontend, backend, database, retrieval layer, and AI integration are connected and operational."

## Controls Audit

| Section | Control | Demo Status |
| --- | --- | --- |
| Sidebar | Navigation buttons | Working |
| Sidebar | Help | Opens demo guide modal |
| Sidebar | Settings | Opens system status modal |
| Topbar | Search | Works in Agent Workspace and Knowledge |
| Topbar | Notification bell | Opens readiness popover |
| Agent Workspace | Conversation rows | Switch conversation context |
| Agent Workspace | Mine/Unassigned tabs | Filter conversation queue |
| Agent Workspace | Reply/Internal note | Switch composer mode |
| Agent Workspace | Send | Adds agent reply or internal note |
| Agent Workspace | Accept/Edit/Reject | Stores agent action via backend |
| Agent Workspace | Regenerate | Refreshes suggestion draft |
| Customer Chat | Send | Calls backend chat API |
| Customer Chat | Star rating/Submit | Stores feedback via backend |
| Knowledge | Add knowledge | Stores new record in SQLite |
| Knowledge | Search/filter | Filters visible records |
| Knowledge | Row details | Expands record content |
| Knowledge | Delete row/selected | Deletes records from SQLite |
| Analytics | Refresh data | Reloads backend analytics summary |
| Settings | Close | Closes modal |

## Safe Demo Queries

- `How long does a refund take after approval?`
- `My product arrived damaged. What should I do?`
- `How can I reset my password?`
- `Can I change my delivery address?`

## Things To Avoid During Demo

- Do not delete important seeded knowledge records.
- Do not expose the `.env` file or API keys.
- Do not promise that authentication is implemented; mention it as future enhancement.
- Do not say the app trains a new model from scratch. It uses existing AI services, embeddings, semantic retrieval, and Mastra/Gemini integration.
- Do not rely on Mastra Cloud live response if internet is unstable; the app has local knowledge fallback behavior.

## Final Confidence Statement

ARIA demonstrates a working full-stack AI-assisted customer support workflow with React, TypeScript, Express, SQLite persistence, semantic retrieval, feedback learning, analytics, and Mastra/Gemini AI integration.
