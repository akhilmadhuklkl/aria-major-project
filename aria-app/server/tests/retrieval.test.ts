import assert from 'node:assert/strict'
import test from 'node:test'
import { HybridKnowledgeRetriever } from '../hybrid-retrieval.js'
import { cosineSimilarity } from '../semantic-retrieval.js'

test('cosine similarity returns one for identical normalized vectors', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1)
})

test('cosine similarity returns zero for orthogonal vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
})

test('cosine similarity rejects incompatible vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [1]), 0)
  assert.equal(cosineSimilarity([], []), 0)
})

test('hybrid retrieval adds verified graph evidence and boost to matching knowledge', async () => {
  const semanticRetriever = {
    async search() {
      return [{
        id: 1,
        title: 'Refund and return policy',
        category: 'Policy',
        content: 'Approved refunds are normally posted within 5-7 business days.',
        status: 'indexed',
        uses: 10,
        updatedAt: new Date().toISOString(),
        similarity: 0.5,
      }]
    },
    async dispose() {},
  }
  const retriever = new HybridKnowledgeRetriever(
    () => [{
      id: 1,
      title: 'Refund and return policy',
      category: 'Policy',
      content: 'Approved refunds are normally posted within 5-7 business days.',
      status: 'indexed',
      uses: 10,
      updatedAt: new Date().toISOString(),
      score: 1,
    }],
    semanticRetriever,
    undefined,
    async () => ['Refund and return policy'],
  )

  const [match] = await retriever.retrieve('When will my refund arrive?')
  assert.equal(match.title, 'Refund and return policy')
  assert.equal(match.retrievalMethod, 'hybrid')
  assert.deepEqual(match.graphEvidence, ['Linked through the verified ontology graph'])
  assert.ok((match.score ?? 0) > 0.5)
  await retriever.dispose()
})
