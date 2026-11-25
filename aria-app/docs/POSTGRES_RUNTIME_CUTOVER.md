# PostgreSQL Runtime Cutover

## Current State

ARIA currently runs on SQLite through Node's synchronous `DatabaseSync` API. PostgreSQL support is prepared for migration, preflight checks, schema verification, row-count validation, and CI validation, but the live request handlers still use SQLite directly.

`DATABASE_ENGINE=sqlite` is therefore the only supported runtime setting. The server fails fast for other values so a deployment cannot appear to use PostgreSQL while silently writing to SQLite.

## Adapter Progress

SQLite storage boundaries now cover authentication, conversations/messages, feedback, notifications, audit logs, webhooks, knowledge/embeddings, analytics, system probes, and graph operations.

The first asynchronous PostgreSQL implementation is the notification repository. It is not yet selected by live request handlers. Its unit tests run with `npm test`; its real PostgreSQL lifecycle test runs with `npm run test:postgres` when `DATABASE_URL` is set. GitHub Actions runs that integration test in the PostgreSQL job after schema verification. Tests use a connection-local temporary notification table and roll back, leaving imported notification records unchanged.

Other PostgreSQL adapters, asynchronous caller conversion, shared cross-engine contract tests, transactional writes, and production cutover remain pending. Existing synchronous SQLite contracts must still be reconciled with the async adapters before runtime selection can be enabled.

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
