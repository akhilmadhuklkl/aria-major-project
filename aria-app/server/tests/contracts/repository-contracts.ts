import assert from 'node:assert/strict'
import type { AsyncGraphRepository, GraphRepository } from '../../repositories/graph-repository.js'
import type { AsyncKnowledgeRepository, KnowledgeRepository } from '../../repositories/knowledge-repository.js'

type GraphContractRepository = GraphRepository | AsyncGraphRepository
type KnowledgeContractRepository = KnowledgeRepository | AsyncKnowledgeRepository

export async function runGraphRepositoryContract(repository: GraphContractRepository, prefix: string) {
  const issueId = `${prefix}:issue`
  const procedureId = `${prefix}:procedure`
  const knowledgeId = `${prefix}:knowledge`
  const nodeIds = new Set([issueId, procedureId, knowledgeId])

  try {
    const first = await repository.upsertGraphNode({
      id: issueId,
      type: 'SupportIssue',
      properties: { title: 'Contract refund delay', active: false, count: 0, optional: null },
    })
    assert.equal(first?.properties.title, 'Contract refund delay')
    const createdAt = first?.createdAt

    const updated = await repository.upsertGraphNode({
      id: issueId,
      type: 'SupportAgent',
      properties: { title: 'Contract refund delay', status: 'reviewed' },
    })
    assert.equal(updated?.type, 'SupportAgent')
    assert.equal(updated?.createdAt, createdAt)
    assert.equal((await repository.getGraphNode(issueId))?.properties.status, 'reviewed')

    await repository.upsertGraphNode({ id: procedureId, type: 'SupportProcedure' })
    await repository.upsertGraphNode({ id: knowledgeId, type: 'KnowledgeDocument', properties: { title: 'Contract refund policy' } })
    await repository.createGraphRelationship({ sourceId: issueId, type: 'RESOLVED_BY', targetId: procedureId })
    await repository.createGraphRelationship({ sourceId: procedureId, type: 'SUPPORTED_BY', targetId: knowledgeId })
    await repository.createGraphRelationship({ sourceId: knowledgeId, type: 'ABOUT', targetId: issueId })

    const relationships = (await repository.listGraphRelationships()).filter((item) => nodeIds.has(item.sourceId) || nodeIds.has(item.targetId))
    assert.equal(relationships.length, 3)
    assert.ok((await repository.queryGraphPaths(issueId, 2)).some((path) => path.nodes.join(',') === `${issueId},${procedureId},${knowledgeId}`))
    assert.ok((await repository.findGraphKnowledgeTitles('contract refund')).includes('Contract refund policy'))
    assert.deepEqual(await repository.queryGraphPaths(`${prefix}:missing`), [])
    assert.equal(await repository.deleteGraphNode(knowledgeId), true)
    assert.equal((await repository.listGraphRelationships()).filter((item) => nodeIds.has(item.sourceId) || nodeIds.has(item.targetId)).length, 1)
  } finally {
    await repository.deleteGraphNode(issueId)
    await repository.deleteGraphNode(procedureId)
    await repository.deleteGraphNode(knowledgeId)
  }
}

export async function runKnowledgeRepositoryContract(repository: KnowledgeContractRepository, prefix: string) {
  const title = `${prefix} policy`
  let documentId: number | undefined

  try {
    const document = await repository.createKnowledgeDocument({
      title,
      category: 'Policy',
      content: 'Contract guidance',
      sourceFilename: `${prefix}.txt`,
    })
    documentId = document.id
    assert.equal(document.status, 'indexed')
    assert.equal(document.archivedAt, null)
    assert.equal((await repository.getKnowledgeDocumentVersions(document.id))[0]?.version, 1)

    await repository.upsertKnowledgeEmbedding({
      knowledgeDocumentId: document.id,
      model: 'contract-model',
      vector: [1, 0],
      contentHash: 'contract-hash',
    })
    assert.equal((await repository.listEmbeddedKnowledge()).find((item) => item.id === document.id)?.model, 'contract-model')

    const updated = await repository.updateKnowledgeDocument(document.id, {
      title,
      category: 'Policy',
      content: 'Revised contract guidance',
      status: 'indexed',
      sourceFilename: `${prefix}.txt`,
    })
    assert.equal(updated?.content, 'Revised contract guidance')
    assert.deepEqual((await repository.getKnowledgeDocumentVersions(document.id)).map((item) => item.version), [2, 1])
    assert.equal((await repository.listEmbeddedKnowledge()).some((item) => item.id === document.id), false)

    assert.equal(Number((await repository.archiveKnowledgeDocuments([document.id, document.id])).archived), 1)
    assert.equal((await repository.listKnowledge()).some((item) => item.id === document.id), false)
    assert.ok((await repository.listArchivedKnowledge()).some((item) => item.id === document.id))
    assert.equal(Number((await repository.restoreKnowledgeDocuments([document.id])).restored), 1)
    assert.equal((await repository.listKnowledge()).some((item) => item.id === document.id), true)
    assert.equal(Number((await repository.deleteKnowledgeDocuments([document.id, document.id])).deleted), 1)
    assert.equal((await repository.getKnowledgeDocumentVersions(document.id)).length, 0)
    documentId = undefined
  } finally {
    if (documentId !== undefined) await repository.deleteKnowledgeDocuments([documentId])
  }
}
