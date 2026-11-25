import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { createSqliteGraphRepository } from '../repositories/sqlite-graph-repository.js'

function fixture() {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(readFileSync('server/migrations/006_knowledge_graph.sql', 'utf8'))
  return { db, repository: createSqliteGraphRepository(db) }
}

test('graph repository preserves properties, upserts edges, and cascades node deletion', () => {
  const { db, repository } = fixture()
  try {
    const { upsertGraphNode, getGraphNode, createGraphRelationship, listGraphRelationships, deleteGraphNode } = repository
    upsertGraphNode({ id: 'a', type: 'Customer', properties: { name: 'Customer', active: false, count: 0, optional: null } })
    upsertGraphNode({ id: 'b', type: 'Order' })
    assert.deepEqual(getGraphNode('a')?.properties, { name: 'Customer', active: false, count: 0, optional: null })
    const createdAt = getGraphNode('a')?.createdAt
    upsertGraphNode({ id: 'a', type: 'SupportAgent', properties: { name: 'Agent' } })
    assert.equal(getGraphNode('a')?.createdAt, createdAt)
    assert.equal(getGraphNode('a')?.type, 'SupportAgent')
    createGraphRelationship({ sourceId: 'a', targetId: 'b', type: 'OWNS' })
    createGraphRelationship({ sourceId: 'a', targetId: 'b', type: 'OWNS', properties: { verified: true } })
    assert.equal(listGraphRelationships().length, 1)
    assert.deepEqual(listGraphRelationships()[0].properties, { verified: true })
    assert.equal(repository.listGraphNodes(1).length, 1)
    assert.throws(() => createGraphRelationship({ sourceId: 'missing', targetId: 'b', type: 'OWNS' }), /FOREIGN KEY/)
    assert.equal(deleteGraphNode('b'), true)
    assert.deepEqual(listGraphRelationships(), [])
    assert.equal(deleteGraphNode('b'), false)
    assert.equal(getGraphNode('b'), null)
    assert.equal(repository.deleteGraphRelationship({ sourceId: 'a', targetId: 'b', type: 'OWNS' }), false)
  } finally { db.close() }
})

test('graph repository retains directed bounded paths and one-hop knowledge lookup', () => {
  const { db, repository } = fixture()
  try {
    repository.upsertGraphNode({ id: 'issue', type: 'SupportIssue', properties: { title: 'Refund delay' } })
    repository.upsertGraphNode({ id: 'procedure', type: 'SupportProcedure' })
    repository.upsertGraphNode({ id: 'knowledge', type: 'KnowledgeDocument', properties: { title: 'Verified policy' } })
    repository.createGraphRelationship({ sourceId: 'issue', type: 'RESOLVED_BY', targetId: 'procedure' })
    repository.createGraphRelationship({ sourceId: 'procedure', type: 'SUPPORTED_BY', targetId: 'knowledge' })
    repository.createGraphRelationship({ sourceId: 'knowledge', type: 'ABOUT', targetId: 'issue' })
    const { queryGraphPaths, findGraphKnowledgeTitles } = repository
    const paths = queryGraphPaths('issue', 99)
    assert.ok(paths.some((path) => path.nodes.join(',') === 'issue,procedure,knowledge'))
    assert.ok(paths.every((path) => path.relationships.length <= 2 && new Set(path.nodes).size === path.nodes.length))
    assert.ok(queryGraphPaths('issue', 1).every((path) => path.relationships.length === 1))
    assert.deepEqual(queryGraphPaths('missing'), [])
    assert.deepEqual(findGraphKnowledgeTitles('refund'), ['Verified policy'])
    assert.deepEqual(findGraphKnowledgeTitles('unrelated'), [])
    assert.deepEqual(findGraphKnowledgeTitles(''), [])
  } finally { db.close() }
})
