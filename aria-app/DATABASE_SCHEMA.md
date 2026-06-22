# ARIA Database Schema

ARIA currently uses SQLite for fast local development and interim demonstration.
The schema can later be migrated to PostgreSQL without changing the frontend API.

## Conversations

- `id`: primary key
- `customer_name`
- `subject`
- `status`
- `priority`
- `topic`
- `created_at`
- `updated_at`

## Messages

- `id`: UUID primary key
- `conversation_id`: foreign key
- `role`: customer or assistant
- `content`
- `confidence`
- `sources`: JSON list
- `should_escalate`
- `created_at`

## Feedback

- `id`: UUID primary key
- `message_id`: foreign key
- `conversation_id`: foreign key
- `rating`
- `feedback_type`: customer_rating, accepted, edited, or rejected
- `comment`
- `edited_response`
- `quality_score`
- `created_at`

## Knowledge Documents

- `id`: primary key
- `title`
- `category`
- `content`
- `status`
- `uses`
- `updated_at`

The backend supports listing, creating, and keyword-searching these knowledge
documents. The current interim agent uses the search result titles as response
sources and increments `uses` when a source is applied to a generated reply.

## Adaptive Quality Scoring

Customer ratings are converted to a score from 0-100. Agent actions adjust the
score: accepted responses receive a positive adjustment, while rejected responses
receive a negative adjustment. These stored signals power the analytics dashboard
and will later influence Mastra retrieval and response evaluation.
