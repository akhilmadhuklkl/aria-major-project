import assert from 'node:assert/strict'
import test from 'node:test'
import { getDocumentType } from '../document-extraction.js'

test('document type detection supports managed upload formats', () => {
  assert.equal(getDocumentType('policy.pdf'), 'pdf')
  assert.equal(getDocumentType('manual.docx'), 'docx')
  assert.equal(getDocumentType('notes.txt'), 'txt')
  assert.equal(getDocumentType('records.csv'), 'csv')
})

test('document type detection rejects unsupported files', () => {
  assert.equal(getDocumentType('image.png', 'image/png'), null)
})
