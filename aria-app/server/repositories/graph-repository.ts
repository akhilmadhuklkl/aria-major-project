export type GraphNodeType = 'Customer' | 'Order' | 'Product' | 'Payment' | 'Refund' | 'Delivery' | 'Subscription' | 'SupportIssue' | 'SupportProcedure' | 'KnowledgeDocument' | 'SupportAgent'

export type GraphProperties = Record<string, string | number | boolean | null>
export type GraphNodeRecord = { id: string; type: string; properties: GraphProperties; createdAt: string; updatedAt: string }
export type GraphRelationshipInput = { sourceId: string; type: string; targetId: string; properties?: GraphProperties }
export type GraphRelationshipRecord = GraphRelationshipInput & { properties: GraphProperties; createdAt: string }
export type GraphPath = { nodes: string[]; relationships: string[] }

export interface GraphRepository {
  upsertGraphNode(input: { id: string; type: GraphNodeType; properties?: GraphProperties }): GraphNodeRecord | null
  getGraphNode(id: string): GraphNodeRecord | null
  listGraphNodes(limit?: number): GraphNodeRecord[]
  createGraphRelationship(input: GraphRelationshipInput): GraphRelationshipInput & { properties: GraphProperties }
  listGraphRelationships(limit?: number): GraphRelationshipRecord[]
  deleteGraphRelationship(input: Pick<GraphRelationshipInput, 'sourceId' | 'type' | 'targetId'>): boolean
  deleteGraphNode(id: string): boolean
  queryGraphPaths(startId: string, maxHops?: number): GraphPath[]
  findGraphKnowledgeTitles(query: string): string[]
}

export interface AsyncGraphRepository {
  upsertGraphNode(input: { id: string; type: GraphNodeType; properties?: GraphProperties }): Promise<GraphNodeRecord | null>
  getGraphNode(id: string): Promise<GraphNodeRecord | null>
  listGraphNodes(limit?: number): Promise<GraphNodeRecord[]>
  createGraphRelationship(input: GraphRelationshipInput): Promise<GraphRelationshipInput & { properties: GraphProperties }>
  listGraphRelationships(limit?: number): Promise<GraphRelationshipRecord[]>
  deleteGraphRelationship(input: Pick<GraphRelationshipInput, 'sourceId' | 'type' | 'targetId'>): Promise<boolean>
  deleteGraphNode(id: string): Promise<boolean>
  queryGraphPaths(startId: string, maxHops?: number): Promise<GraphPath[]>
  findGraphKnowledgeTitles(query: string): Promise<string[]>
}
