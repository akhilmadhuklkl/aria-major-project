# Neo4j Migration Preparation

ARIA uses SQLite by default because it keeps the local demo simple and self-contained. Neo4j is available as an optional backend for larger graph workloads. When `GRAPH_STORE=neo4j` is enabled, the Graph Explorer API, graph path queries, graph CRUD operations, and graph-aware hybrid retrieval use Neo4j. SQLite remains the default when the variable is not set.

## Start Neo4j locally

1. Add a strong local-only password to `.env`:

   ```env
   NEO4J_PASSWORD=replace-with-a-strong-local-password
   ```

2. Start only the optional Neo4j service:

   ```bash
   docker compose --profile neo4j up -d neo4j
   ```

3. Open `http://localhost:7474` and sign in with username `neo4j` and the password from `.env`.

## Migrate the current SQLite graph

After Neo4j is running and the connection variables are configured, run this explicit migration command from `aria-app/`:

```bash
GRAPH_STORE=neo4j npm run migrate:neo4j
```

On PowerShell:

```powershell
$env:GRAPH_STORE = 'neo4j'
npm run migrate:neo4j
```

The script is repeatable: node and relationship writes use stable identifiers and update existing records instead of creating duplicates. It does not delete SQLite data.

Verify parity before switching the application:

```bash
GRAPH_STORE=neo4j npm run verify:neo4j
```

The read-only checker compares node IDs and relationship triples and exits with a failure status if either store differs.

When `GRAPH_STORE=neo4j` is enabled, `/api/ready` verifies Neo4j connectivity and returns HTTP 503 if Neo4j is unavailable. This prevents a deployment from receiving traffic while graph retrieval is disconnected.

The adapter also ensures a unique constraint on `Entity.id` and an index on `Entity.type` during connection verification. These are safe, repeatable schema operations and prevent duplicate ontology IDs during migration or graph management.

For hosted deployments, tune `NEO4J_MAX_POOL_SIZE` and `NEO4J_CONNECTION_TIMEOUT_MS` through the deployment environment. The defaults are 50 connections and a 10-second connection timeout.

Set `NEO4J_ENCRYPTED=true` for hosted Neo4j connections. Keep it `false` only for a local development instance where encrypted Bolt transport is not configured.

## Backup and restore

Create a local JSON backup:

```bash
npm run backup:neo4j
```

Restore a previously created backup:

```bash
npm run restore:neo4j -- backups/neo4j-graph.json
```

Both operations are explicit and require a configured Neo4j password. Restore is additive and repeatable; it does not delete records that are not present in the backup. Keep generated backups outside Git and protect them as project data.

## Runtime status and cutover checklist

The Neo4j adapter is implemented and writes the current ontology model using:

- `graph_nodes` -> labeled Neo4j nodes with stable IDs
- `graph_relationships` -> typed directed relationships
- `properties` -> sanitized node and relationship properties

The graph API and hybrid retrieval support the `GRAPH_STORE=sqlite|neo4j` setting. SQLite remains the default. Before switching a deployment to Neo4j, migrate the existing nodes and relationships, verify path-query parity, validate graph-aware retrieval, and test backup/restore procedures. The conversations, messages, knowledge documents, embeddings, feedback, authentication, notifications, webhooks, and analytics tables still use SQLite; PostgreSQL runtime cutover is a separate pending enhancement.

## Security rules

- Never commit `.env`, Neo4j passwords, database dumps, or browser credentials.
- Keep the Neo4j service behind a private network in production.
- Use encrypted transport for hosted Neo4j connections.
- Rotate the password before sharing any deployment or backup artifact.
