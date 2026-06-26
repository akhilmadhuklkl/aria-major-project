import type { KnowledgeDocument } from './database.js'
import type { KnowledgeRetriever, KnowledgeSnippet } from './agent-service.js'
import { SemanticKnowledgeRetriever, type SemanticKnowledgeMatch } from './semantic-retrieval.js'
import { FeedbackAdaptationRanker } from './feedback-adaptation.js'

type KeywordRetriever = (query: string, limit?: number) => Array<KnowledgeDocument & { score?: number }>
type SemanticRetriever = {
  search(query: string): Promise<SemanticKnowledgeMatch[]>
  dispose(): Promise<void>
}

export class HybridKnowledgeRetriever {
  private readonly semanticRetriever: SemanticRetriever
  private readonly feedbackRanker: FeedbackAdaptationRanker
  private readonly keywordRetriever: KeywordRetriever

  constructor(
    keywordRetriever: KeywordRetriever,
    semanticRetriever: SemanticRetriever = new SemanticKnowledgeRetriever(),
    feedbackRanker: FeedbackAdaptationRanker = new FeedbackAdaptationRanker(),
  ) {
    this.keywordRetriever = keywordRetriever
    this.semanticRetriever = semanticRetriever
    this.feedbackRanker = feedbackRanker
  }

  retrieve: KnowledgeRetriever = async (query) => {
    try {
      const semanticMatches = await this.semanticRetriever.search(query)
      const adaptedMatches = this.feedbackRanker.rank(semanticMatches)

      return adaptedMatches.map((item) => ({
        title: item.title,
        category: item.category,
        content: item.content,
        score: item.adjustedScore,
        semanticScore: item.similarity,
        feedbackAdjustment: item.feedbackAdjustment,
        feedbackCount: item.feedbackCount,
        averageQuality: item.averageQuality,
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
