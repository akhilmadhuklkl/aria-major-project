import {
  calculateFeedbackAdjustment,
  maximumFeedbackAdjustment,
  rankWithFeedback,
} from '../feedback-adaptation.js'
import { getKnowledgeSourceFeedbackStats } from '../database.js'
import type { SemanticKnowledgeMatch } from '../semantic-retrieval.js'

const closeMatches = [
  createMatch('Source A', 0.41),
  createMatch('Source B', 0.40),
]
const distantMatches = [
  createMatch('Relevant source', 0.62),
  createMatch('Popular but weak source', 0.36),
]

const strongPositive = createStats('Source B', 20, 100)
const strongNegative = createStats('Source A', 20, 20)
const onePositive = createStats('One-rating source', 1, 100)
const neutral = createStats('Neutral source', 12, 60)

const closeRanking = rankWithFeedback(closeMatches, [strongNegative, strongPositive])
const distantRanking = rankWithFeedback(distantMatches, [
  createStats('Popular but weak source', 100, 100),
])

const checks = {
  positiveCanReorderCloseMatches: closeRanking[0]?.title === 'Source B',
  distantSemanticLeadIsPreserved: distantRanking[0]?.title === 'Relevant source',
  oneRatingIsShrunk:
    Math.abs(calculateFeedbackAdjustment(onePositive)) < maximumFeedbackAdjustment / 2,
  neutralFeedbackHasNoEffect: calculateFeedbackAdjustment(neutral) === 0,
  adjustmentIsBounded: [
    strongPositive,
    strongNegative,
    onePositive,
    neutral,
  ].every((stats) => Math.abs(calculateFeedbackAdjustment(stats)) <= maximumFeedbackAdjustment),
}

console.log(JSON.stringify({
  checks,
  passed: Object.values(checks).filter(Boolean).length,
  total: Object.keys(checks).length,
  maximumFeedbackAdjustment,
  examples: {
    closeRanking: closeRanking.map(projectResult),
    distantRanking: distantRanking.map(projectResult),
    onePositiveAdjustment: calculateFeedbackAdjustment(onePositive),
  },
  currentDatabaseStats: getKnowledgeSourceFeedbackStats(),
}, null, 2))

function createMatch(title: string, similarity: number): SemanticKnowledgeMatch {
  return {
    id: title.length,
    title,
    category: 'Test',
    content: 'Evaluation record',
    status: 'indexed',
    uses: 0,
    updatedAt: new Date(0).toISOString(),
    similarity,
  }
}

function createStats(title: string, feedbackCount: number, averageQuality: number) {
  return {
    title,
    feedbackCount,
    averageQuality,
    averageRating: 0,
    acceptedCount: 0,
    editedCount: 0,
    rejectedCount: 0,
  }
}

function projectResult(result: {
  title: string
  similarity: number
  feedbackAdjustment: number
  adjustedScore: number
}) {
  return {
    title: result.title,
    similarity: Number(result.similarity.toFixed(4)),
    feedbackAdjustment: Number(result.feedbackAdjustment.toFixed(4)),
    adjustedScore: Number(result.adjustedScore.toFixed(4)),
  }
}
