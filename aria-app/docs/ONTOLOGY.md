# ARIA Knowledge Graph Ontology

> Design baseline for ARIA's implemented Knowledge Graph and Ontology layer.

## Purpose

ARIA combines semantic retrieval, keyword fallback, and graph evidence from the support-domain ontology. The current application supports graph exploration, node and relationship management, path queries, and graph-aware hybrid retrieval. SQLite is the default graph store, with optional Neo4j support for larger workloads.

## Initial Scope

The first version focuses on common support workflows:

- refunds and returns
- orders and products
- payments
- delivery and address changes
- subscriptions
- support issues and escalation
- verified knowledge documents and procedures

## Entity Vocabulary

| Entity | Meaning | Example properties |
| --- | --- | --- |
| `Customer` | Person requesting support | `id`, `name`, `accountStatus` |
| `Order` | Customer purchase or transaction | `id`, `status`, `createdAt`, `total` |
| `Product` | Item included in an order | `id`, `name`, `category` |
| `Payment` | Payment attempt or completed payment | `id`, `status`, `method`, `amount` |
| `Refund` | Refund request or refund transaction | `id`, `status`, `amount`, `approvedAt` |
| `Delivery` | Fulfilment and shipping information | `id`, `status`, `carrier`, `expectedDate` |
| `Subscription` | Recurring customer plan | `id`, `status`, `renewalDate` |
| `SupportIssue` | Customer problem or support intent | `id`, `type`, `priority`, `status` |
| `SupportProcedure` | Verified action or resolution procedure | `id`, `title`, `steps`, `category` |
| `KnowledgeDocument` | Source document used to ground answers | `id`, `title`, `category`, `status` |
| `SupportAgent` | Human reviewer of an AI suggestion | `id`, `name`, `role` |

## Relationship Vocabulary

| Relationship | Source | Target | Meaning |
| --- | --- | --- | --- |
| `OWNS` | `Customer` | `Order` | Customer placed or owns an order |
| `CONTAINS` | `Order` | `Product` | Order includes a product |
| `HAS_PAYMENT` | `Order` | `Payment` | Order is associated with a payment |
| `HAS_REFUND` | `Order` | `Refund` | Order has a refund request or transaction |
| `HAS_DELIVERY` | `Order` | `Delivery` | Order has delivery information |
| `HAS_SUBSCRIPTION` | `Customer` | `Subscription` | Customer owns a subscription |
| `REPORTS` | `Customer` | `SupportIssue` | Customer reports an issue |
| `ABOUT` | `SupportIssue` | `Order` | Issue concerns an order |
| `RESOLVED_BY` | `SupportIssue` | `SupportProcedure` | Procedure can resolve the issue |
| `SUPPORTED_BY` | `SupportProcedure` | `KnowledgeDocument` | Procedure is backed by a verified source |
| `RELATED_TO` | `KnowledgeDocument` | `SupportIssue` | Document covers an issue type |
| `REVIEWED_BY` | `SupportIssue` | `SupportAgent` | Issue was reviewed by an agent |

## Example Graph Facts

```text
Customer:customer-001 OWNS Order:order-20491
Order:order-20491 HAS_REFUND Refund:refund-20491
Refund:refund-20491 RESOLVED_BY SupportProcedure:refund-timeline-check
SupportProcedure:refund-timeline-check SUPPORTED_BY KnowledgeDocument:refund-policy
```

These facts allow a question such as “When should my refund arrive?” to be connected to the order, refund state, procedure, and verified policy source.

## Retrieval Integration

The backend preserves the semantic retrieval path and adds graph evidence as a second signal:

```text
Customer question
    -> entity and intent extraction
    -> semantic retrieval + graph traversal
    -> evidence filtering and ranking
    -> combined verified context
    -> AI response generation
```

Graph results must not be treated as authoritative solely because they exist. They should be linked to a verified `KnowledgeDocument`, filtered by status, and passed to the same grounding and escalation rules used by the existing retrieval workflow.

## Initial Constraints

- Every graph node must have a stable identifier and explicit entity type.
- Relationships must use the controlled vocabulary above.
- Knowledge documents must retain their source, status, and update timestamp.
- Missing or conflicting graph facts must trigger clarification or escalation.
- Customer-specific facts must not be inferred from general knowledge documents.
- Existing semantic retrieval and keyword fallback must remain available during rollout.

## Suggested TypeScript Contract

```ts
export type GraphNodeType =
  | 'Customer'
  | 'Order'
  | 'Product'
  | 'Payment'
  | 'Refund'
  | 'Delivery'
  | 'Subscription'
  | 'SupportIssue'
  | 'SupportProcedure'
  | 'KnowledgeDocument'
  | 'SupportAgent'

export type GraphNode = {
  id: string
  type: GraphNodeType
  properties: Record<string, string | number | boolean | null>
}

export type GraphRelationship = {
  sourceId: string
  type: string
  targetId: string
  properties?: Record<string, string | number | boolean | null>
}
```

## Implementation Status

The graph-storage adapter, seeded ontology facts, graph explorer API, CRUD operations, bounded path queries, and graph-aware hybrid retrieval are implemented. SQLite is the default graph store; Neo4j is available through `GRAPH_STORE=neo4j` for larger deployments. The next graph-specific step is an optional hosted Neo4j rollout with migration, parity verification, and backup/restore rehearsal.
