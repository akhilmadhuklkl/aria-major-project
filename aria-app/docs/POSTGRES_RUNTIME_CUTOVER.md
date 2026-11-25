# PostgreSQL Runtime Cutover

## Current State

ARIA currently runs on SQLite through Node's synchronous `DatabaseSync` API. PostgreSQL support is prepared for migration, preflight checks, schema verification, row-count validation, and CI validation, but the live request handlers still use SQLite directly.

`DATABASE_ENGINE=sqlite` is therefore the only supported runtime setting. The server fails fast for other values so a deployment cannot appear to use PostgreSQL while silently writing to SQLite.

## Adapter Progress

SQLite storage boundaries now cover authentication, conversations/messages, feedback, notifications, audit logs, webhooks, knowledge/embeddings, analytics, system probes, and graph operations.

The first asynchronous PostgreSQL implementation is the notification repository. It is not yet selected by live request handlers. Its unit tests run with `npm test`; its real PostgreSQL lifecycle test runs with `npm run test:postgres` when `DATABASE_URL` is set. GitHub Actions runs that integration test in the PostgreSQL job after schema verification. Tests use a connection-local temporary notification table and roll back, leaving imported notification records unchanged.

The asynchronous PostgreSQL feedback repository now supports customer ratings and agent feedback writes, with parameterized values and nullable fields. Unit tests run with `npm test`; `npm run test:postgres` also covers real PostgreSQL round-trips, duplicate IDs, and foreign-key failures using temporary tables and rollback. This adapter is not yet connected to live routes.

The asynchronous PostgreSQL audit repository supports event insertion and recent-event listing, with JSONB metadata, numeric ID mapping, ISO timestamps, and existing default actor values. Its integration test uses temporary tables with a test-local identity sequence and checks metadata round-trips and actor deletion. Like notifications and feedback, it is not yet selected by the live runtime.

Other PostgreSQL adapters, asynchronous caller conversion, shared cross-engine contract tests, transactional writes, and production cutover remain pending. Existing synchronous SQLite contracts must still be reconciled with the async adapters before runtime selection can be enabled.

The asynchronous PostgreSQL authentication repository now provides user and session persistence, case-insensitive email lookup, public user projections, credential updates, and session revocation. Schema setup remains migration-owned; the adapter checks the migrated tables rather than creating them on a login request. A unique index on `lower(email)` preserves SQLite's email uniqueness behavior. Password hashing, expiry enforcement, authorization, and atomic password-change/session-revocation orchestration remain service responsibilities; live authentication still uses SQLite.

## Cutover Stages

1. Define repository interfaces for authentication, conversations, messages, knowledge, feedback, notifications, webhooks, graph data, and audit logs.
2. Implement a PostgreSQL repository using the existing `pg` pool configuration and parameterized queries.
3. Convert request handlers and retrieval services to depend on repository interfaces instead of importing the SQLite singleton.
4. Add transaction boundaries for chat persistence, knowledge lifecycle updates, webhook records, and audit events.
5. Run SQLite and PostgreSQL contract tests against the same fixtures.
6. Add a deployment setting that selects PostgreSQL only after the full contract suite passes.
7. Run migration, row-count verification, API smoke checks, and production container checks against PostgreSQL before rollout.

## Completion Criteria

- No production request handler imports the SQLite singleton directly.
- PostgreSQL and SQLite pass the same backend contract tests.
- `/api/health` and `/api/ready` report the selected runtime engine.
- Migration verification confirms schema, indexes, completion marker, and source/target row counts.
- Backup and restore procedures are documented for the selected production database.
- The default SQLite demo path remains available for local development.

The current migration commands are documented in `DEPLOYMENT.md`. This document records the remaining runtime-adapter work separately from the already completed migration preparation.
