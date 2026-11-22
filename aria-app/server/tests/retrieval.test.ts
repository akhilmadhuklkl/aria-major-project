import assert from 'node:assert/strict'
import test from 'node:test'
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
