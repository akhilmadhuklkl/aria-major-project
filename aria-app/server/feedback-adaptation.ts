import type { KnowledgeSourceFeedbackStats } from './repositories/knowledge-repository.js'
import type { SemanticKnowledgeMatch } from './semantic-retrieval.js'

export const maximumFeedbackAdjustment = 0.03
export const neutralQualityScore = 60
export const feedbackPriorStrength = 5

export type AdaptedKnowledgeMatch = SemanticKnowledgeMatch & {
  feedbackAdjustment: number
  adjustedScore: number
  feedbackCount: number
  averageQuality: number
}

type FeedbackStatsLoader = () => KnowledgeSourceFeedbackStats[] | Promise<KnowledgeSourceFeedbackStats[]>

export class FeedbackAdaptationRanker {
  private readonly loadFeedbackStats: FeedbackStatsLoader

  constructor(loadFeedbackStats: FeedbackStatsLoader = async () => []) {
    this.loadFeedbackStats = loadFeedbackStats
  }

  async rank(matches: SemanticKnowledgeMatch[]) {
    return rankWithFeedback(matches, await this.loadFeedbackStats())
  }
}

export function rankWithFeedback(
  matches: SemanticKnowledgeMatch[],
  feedbackStats: KnowledgeSourceFeedbackStats[],
): AdaptedKnowledgeMatch[] {
  const statsByTitle = new Map(feedbackStats.map((item) => [item.title, item]))

  return matches
    .map((match) => {
      const stats = statsByTitle.get(match.title)
      const feedbackAdjustment = calculateFeedbackAdjustment(stats)
      return {
        ...match,
        feedbackAdjustment,
        adjustedScore: match.similarity + feedbackAdjustment,
        feedbackCount: stats?.feedbackCount ?? 0,
        averageQuality: stats?.averageQuality ?? neutralQualityScore,
      }
    })
    .sort((first, second) => (
      second.adjustedScore - first.adjustedScore
      || second.similarity - first.similarity
    ))
}

export function calculateFeedbackAdjustment(stats?: KnowledgeSourceFeedbackStats) {
  if (!stats || stats.feedbackCount === 0) return 0

  const qualitySignal = clamp(
    (stats.averageQuality - neutralQualityScore) / 40,
    -1,
    1,
  )
  const evidenceWeight = stats.feedbackCount / (stats.feedbackCount + feedbackPriorStrength)

  return qualitySignal * evidenceWeight * maximumFeedbackAdjustment
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
