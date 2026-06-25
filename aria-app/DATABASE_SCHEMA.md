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
- `source_scores`: JSON list of source titles and similarity scores
- `retrieval_method`: semantic, keyword, or none
- `generation_provider`: Mastra/Gemini or local knowledge fallback
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

## Knowledge Embeddings

- `knowledge_document_id`: primary and foreign key
- `model`: local embedding model identifier
- `dimensions`: vector length
- `vector`: normalized vector stored as JSON
- `content_hash`: SHA-256 hash used to skip unchanged records
- `updated_at`

Indexed knowledge records are converted into local 384-dimensional MiniLM
vectors. Live chat uses cosine similarity for semantic retrieval and retains
keyword search as a runtime fallback if the embedding system is unavailable.

## Adaptive Quality Scoring

Customer ratings are converted to a score from 0-100. Agent actions adjust the
score: accepted responses receive a positive adjustment, while rejected responses
receive a negative adjustment. These stored signals power the analytics dashboard
and will later influence Mastra retrieval and response evaluation.
