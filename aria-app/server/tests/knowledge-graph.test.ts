import assert from 'node:assert/strict'
import test from 'node:test'
import { createGraphRelationship, deleteGraphNode, deleteGraphRelationship, findGraphKnowledgeTitles, getGraphNode, listGraphNodes, listGraphRelationships, queryGraphPaths, upsertGraphNode } from '../database.js'

test('seeded ontology exposes a two-hop refund path', () => {
  const paths = queryGraphPaths('customer:customer-001', 2)
  assert.ok(paths.some((path) => path.nodes.includes('refund:refund-20491')))
})

test('graph evidence links refund questions to the verified policy', () => {
  assert.ok(findGraphKnowledgeTitles('When will my refund arrive?').includes('Refund and return policy'))
})

test('graph explorer data includes typed nodes and directional relationships', () => {
  const nodes = listGraphNodes() as unknown as Array<{ id: string; type: string }>
  const relationships = listGraphRelationships() as unknown as Array<{ sourceId: string; targetId: string; type: string }>
  const refund = getGraphNode('refund:refund-20491') as unknown as { type?: string } | null

  assert.equal(refund?.type, 'Refund')
  assert.ok(nodes.some((node) => node.id === 'issue:refund-delay' && node.type === 'SupportIssue'))
  assert.ok(relationships.some((relationship) => (
    relationship.sourceId === 'issue:refund-delay'
    && relationship.targetId === 'agent:support-001'
    && relationship.type === 'ASSIGNED_TO'
  )))
})

test('graph CRUD updates and removes ontology records safely', () => {
  const sourceId = 'test:graph-source'
  const targetId = 'test:graph-target'
  try {
    upsertGraphNode({ id: sourceId, type: 'SupportIssue', properties: { title: 'Temporary issue' } })
    upsertGraphNode({ id: targetId, type: 'SupportProcedure', properties: { title: 'Temporary procedure' } })
    createGraphRelationship({ sourceId, type: 'RESOLVED_BY', targetId })

    assert.equal((getGraphNode(sourceId) as { properties: Record<string, string> }).properties.title, 'Temporary issue')
    assert.ok((listGraphRelationships() as unknown as Array<{ sourceId: string }>).some((relationship) => relationship.sourceId === sourceId))

    upsertGraphNode({ id: sourceId, type: 'SupportIssue', properties: { title: 'Updated issue' } })
    assert.equal((getGraphNode(sourceId) as { properties: Record<string, string> }).properties.title, 'Updated issue')
    assert.equal(deleteGraphRelationship({ sourceId, type: 'RESOLVED_BY', targetId }), true)
    assert.equal(deleteGraphNode(sourceId), true)
    assert.equal(deleteGraphNode(targetId), true)
    assert.equal(getGraphNode(sourceId), null)
  } finally {
    deleteGraphRelationship({ sourceId, type: 'RESOLVED_BY', targetId })
    deleteGraphNode(sourceId)
    deleteGraphNode(targetId)
  }
})
