import {
  createContentHash,
  createKnowledgeEmbeddingText,
  embeddingModel,
  LocalEmbeddingService,
} from '../embedding-service.js'
import { databaseEngine } from '../database-runtime.js'
import { createRuntimeRepositories } from '../runtime-repositories.js'

const embeddingService = new LocalEmbeddingService()
const runtime = createRuntimeRepositories(databaseEngine)
const candidates = await runtime.knowledge.listKnowledgeEmbeddingCandidates()
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
    await runtime.knowledge.upsertKnowledgeEmbedding({
      knowledgeDocumentId: candidate.id,
      model: embeddingModel,
      vector,
      contentHash,
    })
    indexed += 1
    console.log(`Indexed ${candidate.title}: ${vector.length} dimensions`)
  }

  const stats = await runtime.knowledge.getKnowledgeEmbeddingStats()
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
} finally {
  await embeddingService.dispose()
  await runtime.close()
}
