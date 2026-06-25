import type { KnowledgeDocument } from './database.js'
import type { KnowledgeRetriever, KnowledgeSnippet } from './agent-service.js'
import { SemanticKnowledgeRetriever, type SemanticKnowledgeMatch } from './semantic-retrieval.js'

type KeywordRetriever = (query: string, limit?: number) => Array<KnowledgeDocument & { score?: number }>
type SemanticRetriever = {
  search(query: string): Promise<SemanticKnowledgeMatch[]>
  dispose(): Promise<void>
}

export class HybridKnowledgeRetriever {
  private readonly semanticRetriever: SemanticRetriever
  private readonly keywordRetriever: KeywordRetriever

  constructor(
    keywordRetriever: KeywordRetriever,
    semanticRetriever: SemanticRetriever = new SemanticKnowledgeRetriever(),
  ) {
    this.keywordRetriever = keywordRetriever
    this.semanticRetriever = semanticRetriever
  }

  retrieve: KnowledgeRetriever = async (query) => {
    try {
      const semanticMatches = await this.semanticRetriever.search(query)
      return semanticMatches.map((item) => ({
        title: item.title,
        category: item.category,
        content: item.content,
        score: item.similarity,
        retrievalMethod: 'semantic' as const,
      }))
    } catch (error) {
      console.warn('Semantic retrieval unavailable; using keyword fallback.', getErrorMessage(error))
      return this.keywordRetriever(query).map(toKeywordSnippet)
    }
  }

  async dispose() {
    await this.semanticRetriever.dispose()
  }
}

function toKeywordSnippet(item: KnowledgeDocument & { score?: number }): KnowledgeSnippet {
  return {
    title: item.title,
    category: item.category,
    content: item.content,
    retrievalMethod: 'keyword',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown semantic retrieval error'
}
