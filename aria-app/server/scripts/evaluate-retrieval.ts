import { searchKnowledge } from '../database.js'
import {
  defaultSemanticThreshold,
  SemanticKnowledgeRetriever,
} from '../semantic-retrieval.js'

const supportCases = [
  {
    query: 'The money that was returned has not reached my bank yet.',
    expected: 'Refund and return policy',
  },
  {
    query: 'I cannot get into my profile and no longer have access to my email.',
    expected: 'Password reset procedure',
  },
  {
    query: 'My parcel has not shipped yet. Can it go to a different location?',
    expected: 'Order delivery FAQ',
  },
  {
    query: 'The item arrived cracked. Which evidence do you need from me?',
    expected: 'Damaged product resolution',
  },
  {
    query: 'I do not want to be billed again next month.',
    expected: 'Subscription terms',
  },
  {
    query: 'The checkout did not finish, but my account was still debited.',
    expected: 'Payment failure troubleshooting',
  },
  {
    query: 'Please tell me the complete card information saved on my profile.',
    expected: 'Data privacy response',
  },
  {
    query: 'My rewards balance did not increase after buying something.',
    expected: 'Loyalty points adjustment',
  },
]

const unrelatedQueries = [
  'What is the weather forecast for tomorrow?',
  'Write a poem about the ocean.',
  'Who won the football match last night?',
]

const semanticRetriever = new SemanticKnowledgeRetriever()

try {
  const supportResults = []

  for (const testCase of supportCases) {
    const semanticMatches = await semanticRetriever.search(testCase.query)
    const keywordMatches = searchKnowledge(testCase.query)
    supportResults.push({
      ...testCase,
      semanticTop: semanticMatches[0]?.title ?? null,
      semanticScore: Number((semanticMatches[0]?.similarity ?? 0).toFixed(4)),
      semanticPassed: semanticMatches[0]?.title === testCase.expected,
      keywordTop: keywordMatches[0]?.title ?? null,
      keywordPassed: keywordMatches[0]?.title === testCase.expected,
    })
  }

  const unrelatedResults = []
  for (const query of unrelatedQueries) {
    const matches = await semanticRetriever.search(query)
    unrelatedResults.push({
      query,
      rejected: matches.length === 0,
      topMatch: matches[0]?.title ?? null,
      topScore: Number((matches[0]?.similarity ?? 0).toFixed(4)),
    })
  }

  console.log(JSON.stringify({
    threshold: defaultSemanticThreshold,
    semanticPassed: supportResults.filter((result) => result.semanticPassed).length,
    keywordPassed: supportResults.filter((result) => result.keywordPassed).length,
    supportTotal: supportResults.length,
    unrelatedRejected: unrelatedResults.filter((result) => result.rejected).length,
    unrelatedTotal: unrelatedResults.length,
    supportResults,
    unrelatedResults,
  }, null, 2))
} finally {
  await semanticRetriever.dispose()
}
