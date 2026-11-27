# Deployment Notes

## Local container run

The default container and CI runners use CPU inference. Dependency installation sets `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` to avoid downloading optional CUDA binaries; this does not disable ONNX Runtime CPU support. GPU-enabled deployments require separate CUDA provisioning.

1. Copy `.env.example` to `.env` and set the required provider key.
2. Run `docker compose up --build` from `aria-app/`.
3. Open `http://localhost:8787/` for the built React application.
4. Verify liveness at `http://localhost:8787/api/health` and readiness at `http://localhost:8787/api/ready`.
5. Run the non-mutating API smoke check with `npm run check:api`.

## SQLite backup

Create a consistent, integrity-checked backup of the local SQLite database before upgrades or migration work:

```bash
npm run backup:sqlite
```

Backups are written to the ignored `backups/` directory. To choose a specific output path, set `SQLITE_BACKUP_PATH`; to choose a directory while retaining timestamped filenames, set `SQLITE_BACKUP_DIR`. The command refuses to overwrite an existing backup and runs SQLite integrity verification before reporting success.

The default container uses SQLite with the `/app/data` volume. Do not commit `.env` or provider keys.
Set `DATABASE_ENGINE=sqlite` explicitly for the local runtime. PostgreSQL can be selected only with `DATABASE_ENGINE=postgres`, a migrated schema, and a valid `DATABASE_URL`; the application fails fast for unsupported runtime values instead of silently falling back to SQLite.

## PostgreSQL migration preparation

The PostgreSQL service is opt-in so the default demo remains SQLite-backed:

```bash
docker compose --profile postgres up -d postgres
DATABASE_URL=postgresql://aria:change-me-before-use@localhost:5432/aria npm run migrate:postgres
```

Before running the import, use the non-mutating preflight to validate the connection and SQLite source:

```bash
DATABASE_URL=postgresql://aria:change-me-before-use@localhost:5432/aria npm run preflight:postgres
```

The preflight performs a PostgreSQL `SELECT 1`, checks SQLite integrity, and prints source row counts. It does not create, update, or delete PostgreSQL data.

The migration script imports the current SQLite records, embeddings, sessions, conversation metadata, knowledge-document versions, notifications, webhook subscriptions, and Knowledge Graph nodes/relationships inside a transaction. After migration and verification, run the PostgreSQL runtime smoke check before deployment. See `docs/POSTGRES_RUNTIME_CUTOVER.md` for the adapter stages and completion criteria.

After migration, verify the target schema without changing data:

```bash
DATABASE_URL=postgresql://aria:change-me-before-use@localhost:5432/aria npm run verify:postgres
```

The verification checks required tables, columns, and production indexes for authentication, conversations, retrieval, notifications, webhooks, and Knowledge Graph storage.
GitHub Actions also provisions PostgreSQL in a dedicated CI job and runs the preflight, migration, and verification commands against a clean database on every push and pull request.

## PostgreSQL backup and restore

Create and validate a native PostgreSQL custom-format backup:

```bash
DATABASE_URL=postgresql://aria:change-me-before-use@localhost:5432/aria npm run backup:postgres
```

Use `POSTGRES_BACKUP_PATH` for a specific filename or `POSTGRES_BACKUP_DIR` for a timestamped backup directory. The command refuses to overwrite an existing file and validates the archive with `pg_restore --list`. Keep generated files in the ignored `backups/` directory and protect them as production data.

Restore is intentionally destructive and requires an explicit confirmation variable. Restore into a maintenance window or a separate verification database, then run `npm run verify:postgres`:

```bash
POSTGRES_RESTORE_CONFIRM=YES DATABASE_URL=postgresql://aria:change-me-before-use@localhost:5432/aria npm run restore:postgres -- backups/aria-postgres-20261127T000000Z.dump
DATABASE_URL=postgresql://aria:change-me-before-use@localhost:5432/aria npm run verify:postgres
```

The restore command validates the archive before applying it, uses a single transaction, and does not print database credentials.

## Production checklist

- Set `AUTH_REQUIRED=true`.
- Set `CORS_ORIGINS` to the exact production frontend origin(s); do not leave permissive CORS enabled publicly.
- Use a strong PostgreSQL password and `DB_SSL=true` for hosted PostgreSQL.
- Configure `GOOGLE_GENERATIVE_AI_API_KEY` or the selected provider key through the deployment secret store.
- Set restrictive CORS origins before public exposure.
- Persist the database volume and configure backups.
- Confirm `/api/health` is monitored and never expose `.env` files.
- Configure deployment monitoring to use `/api/ready` for traffic readiness. It probes the primary database and, when configured, Neo4j; either failure returns HTTP 503. The response reports the primary engine as `database` and the graph engine as `graphStore`.
- Use `SMOKE_API_TOKEN` with `npm run check:api` when `AUTH_REQUIRED=true` so protected read-only endpoints can be checked without performing writes.
