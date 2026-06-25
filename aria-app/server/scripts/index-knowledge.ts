import {
  getKnowledgeEmbeddingStats,
  listKnowledgeEmbeddingCandidates,
  upsertKnowledgeEmbedding,
} from '../database.js'
import {
  createContentHash,
  createKnowledgeEmbeddingText,
  embeddingModel,
  LocalEmbeddingService,
} from '../embedding-service.js'

const embeddingService = new LocalEmbeddingService()
const candidates = listKnowledgeEmbeddingCandidates()
let indexed = 0
let skipped = 0

console.log(`Preparing ${candidates.length} indexed knowledge records with ${embeddingModel}.`)

try {
  for (const candidate of candidates) {
    const text = createKnowledgeEmbeddingText(candidate)
    const contentHash = createContentHash(text)

    if (candidate.contentHash === contentHash) {
      skipped += 1
      console.log(`Skipped unchanged record: ${candidate.title}`)
      continue
    }

    const vector = await embeddingService.embed(text)
    upsertKnowledgeEmbedding({
      knowledgeDocumentId: candidate.id,
      model: embeddingModel,
      vector,
      contentHash,
    })
    indexed += 1
    console.log(`Indexed ${candidate.title}: ${vector.length} dimensions`)
  }
} finally {
  await embeddingService.dispose()
}

const stats = getKnowledgeEmbeddingStats()
console.log(JSON.stringify({
  model: embeddingModel,
  indexed,
  skipped,
  storedEmbeddings: stats.count,
  dimensions: stats.minimumDimensions === stats.maximumDimensions
    ? stats.minimumDimensions
    : `${stats.minimumDimensions}-${stats.maximumDimensions}`,
  modelCount: stats.modelCount,
}, null, 2))
