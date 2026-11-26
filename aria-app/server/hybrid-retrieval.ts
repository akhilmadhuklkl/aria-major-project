import type { KnowledgeDocument } from './repositories/knowledge-repository.js'
import type { KnowledgeRetriever, KnowledgeSnippet } from './agent-service.js'
import { SemanticKnowledgeRetriever, type SemanticKnowledgeMatch } from './semantic-retrieval.js'
import { FeedbackAdaptationRanker } from './feedback-adaptation.js'

type KeywordRetriever = (query: string, limit?: number) => Array<KnowledgeDocument & { score?: number }> | Promise<Array<KnowledgeDocument & { score?: number }>>
type GraphRetriever = (query: string) => string[] | Promise<string[]>
type SemanticRetriever = {
  search(query: string, options?: { limit?: number; threshold?: number }): Promise<SemanticKnowledgeMatch[]>
  dispose(): Promise<void>
}

export class HybridKnowledgeRetriever {
  private readonly semanticRetriever: SemanticRetriever
  private readonly feedbackRanker: FeedbackAdaptationRanker
  private readonly keywordRetriever: KeywordRetriever
  private readonly graphRetriever: GraphRetriever

  constructor(
    keywordRetriever: KeywordRetriever,
    semanticRetriever: SemanticRetriever = new SemanticKnowledgeRetriever(),
    feedbackRanker: FeedbackAdaptationRanker = new FeedbackAdaptationRanker(),
    graphRetriever: GraphRetriever = async () => [],
  ) {
    this.keywordRetriever = keywordRetriever
    this.semanticRetriever = semanticRetriever
    this.feedbackRanker = feedbackRanker
    this.graphRetriever = graphRetriever
  }

  retrieve: KnowledgeRetriever = async (query) => {
    try {
      const semanticMatches = await this.semanticRetriever.search(query, {
        limit: Number(process.env.RETRIEVAL_CANDIDATE_LIMIT ?? 8),
        threshold: Number(process.env.RETRIEVAL_SEMANTIC_THRESHOLD ?? 0.2),
      })
      const keywordMatches = await this.keywordRetriever(query, Number(process.env.RETRIEVAL_CANDIDATE_LIMIT ?? 8))
      const graphTitles = await this.graphRetriever(query)
      const hybridMatches = mergeCandidates(semanticMatches, keywordMatches, graphTitles)
        .filter((item) => item.hybridScore >= Number(process.env.RETRIEVAL_HYBRID_THRESHOLD ?? 0.28))
        .sort((first, second) => second.hybridScore - first.hybridScore)
        .slice(0, 3)
        .map((item) => ({
          ...item,
          similarity: item.hybridScore,
        }))
      const adaptedMatches = await this.feedbackRanker.rank(hybridMatches) as Array<SemanticKnowledgeMatch & {
        semanticSimilarity: number
        feedbackAdjustment: number
        adjustedScore: number
        feedbackCount: number
        averageQuality: number
        graphEvidence?: string[]
      }>

      return adaptedMatches.map((item) => ({
        title: item.title,
        category: item.category,
        content: item.content,
        score: item.adjustedScore,
        semanticScore: item.semanticSimilarity,
        feedbackAdjustment: item.feedbackAdjustment,
        feedbackCount: item.feedbackCount,
        averageQuality: item.averageQuality,
        graphEvidence: item.graphEvidence,
        retrievalMethod: 'hybrid' as const,
      }))
    } catch (error) {
      console.warn('Semantic retrieval unavailable; using keyword fallback.', getErrorMessage(error))
      return (await this.keywordRetriever(query)).map(toKeywordSnippet)
    }
  }

  async dispose() {
    await this.semanticRetriever.dispose()
  }
}

type HybridCandidate = SemanticKnowledgeMatch & {
  semanticSimilarity: number
  keywordSimilarity: number
  hybridScore: number
  graphEvidence?: string[]
}

function mergeCandidates(
  semanticMatches: SemanticKnowledgeMatch[],
  keywordMatches: Array<KnowledgeDocument & { score?: number }>,
  graphTitles: string[],
): HybridCandidate[] {
  const semanticByTitle = new Map(semanticMatches.map((item) => [item.title, item]))
  const keywordMaximum = Math.max(...keywordMatches.map((item) => item.score ?? 0), 0)
  const titles = new Set([...semanticMatches.map((item) => item.title), ...keywordMatches.map((item) => item.title)])
  const semanticWeight = Number(process.env.RETRIEVAL_SEMANTIC_WEIGHT ?? 0.7)
  const keywordWeight = Number(process.env.RETRIEVAL_KEYWORD_WEIGHT ?? 0.3)
  const weightTotal = semanticWeight + keywordWeight || 1

  return [...titles].map((title) => {
    const semantic = semanticByTitle.get(title)
    const keyword = keywordMatches.find((item) => item.title === title)
    const semanticSimilarity = semantic?.similarity ?? 0
    const keywordSimilarity = keywordMaximum > 0 ? (keyword?.score ?? 0) / keywordMaximum : 0
    const graphBoost = graphTitles.includes(title) ? Number(process.env.RETRIEVAL_GRAPH_BOOST ?? 0.08) : 0
    const hybridScore = Math.min(1, (semanticSimilarity * semanticWeight + keywordSimilarity * keywordWeight) / weightTotal + graphBoost)

    return {
      ...(semantic ?? keyword) as SemanticKnowledgeMatch,
      semanticSimilarity,
      keywordSimilarity,
      hybridScore,
      graphEvidence: graphTitles.includes(title) ? ['Linked through the verified ontology graph'] : undefined,
      similarity: hybridScore,
    }
  })
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
