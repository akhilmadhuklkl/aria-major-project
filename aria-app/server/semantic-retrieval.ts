import { listEmbeddedKnowledge, type KnowledgeDocument } from './database.js'
import { LocalEmbeddingService } from './embedding-service.js'

export const defaultSemanticThreshold = 0.3

export type SemanticKnowledgeMatch = KnowledgeDocument & {
  similarity: number
}

export class SemanticKnowledgeRetriever {
  private readonly embeddingService: LocalEmbeddingService

  constructor(embeddingService = new LocalEmbeddingService()) {
    this.embeddingService = embeddingService
  }

  async search(
    query: string,
    options: { limit?: number; threshold?: number } = {},
  ): Promise<SemanticKnowledgeMatch[]> {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) return []

    const queryVector = await this.embeddingService.embed(normalizedQuery)
    const limit = options.limit ?? 3
    const threshold = options.threshold ?? defaultSemanticThreshold

    return listEmbeddedKnowledge()
      .filter((item) => item.dimensions === queryVector.length)
      .map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        content: item.content,
        status: item.status,
        uses: item.uses,
        updatedAt: item.updatedAt,
        similarity: cosineSimilarity(queryVector, item.vector),
      }))
      .filter((item) => item.similarity >= threshold)
      .sort((first, second) => second.similarity - first.similarity)
      .slice(0, limit)
  }

  async dispose() {
    await this.embeddingService.dispose()
  }
}

export function cosineSimilarity(first: number[], second: number[]) {
  if (first.length !== second.length || first.length === 0) return 0

  let dotProduct = 0
  let firstMagnitude = 0
  let secondMagnitude = 0

  for (let index = 0; index < first.length; index += 1) {
    const firstValue = first[index]
    const secondValue = second[index]
    dotProduct += firstValue * secondValue
    firstMagnitude += firstValue * firstValue
    secondMagnitude += secondValue * secondValue
  }

  const denominator = Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude)
  return denominator ? dotProduct / denominator : 0
}
