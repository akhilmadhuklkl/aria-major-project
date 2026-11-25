import type { KnowledgeDocument } from './repositories/knowledge-repository.js'

type KnowledgeListRepository = {
  listKnowledge(): KnowledgeDocument[] | Promise<KnowledgeDocument[]>
}

const ignoredTerms = new Set([
  'the', 'and', 'for', 'you', 'your', 'how', 'long', 'does', 'take', 'after', 'before', 'with',
  'from', 'this', 'that', 'can', 'what', 'when', 'where', 'why',
])

export async function searchKnowledge(
  repository: KnowledgeListRepository,
  message: string,
  limit = 3,
) {
  const terms = message
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !ignoredTerms.has(term))
  const rows = await repository.listKnowledge()

  const scoredRows = rows
    .map((row) => {
      const title = row.title.toLowerCase()
      const category = row.category.toLowerCase()
      const content = row.content.toLowerCase()
      const score = terms.reduce((total, term) => {
        if (title.includes(term)) return total + 4
        if (category.includes(term)) return total + 2
        if (content.includes(term)) return total + 1
        return total
      }, 0)
      return { ...row, score }
    })
    .filter((row) => row.score > 0)
    .sort((first, second) => second.score - first.score || second.uses - first.uses)

  const strongestScore = scoredRows[0]?.score ?? 0
  const strongMatchThreshold = Math.max(2, Math.ceil(strongestScore * 0.5))
  const strongMatches = scoredRows.filter((row) => row.score >= strongMatchThreshold)
  return (strongMatches.length > 0 ? strongMatches : scoredRows).slice(0, limit)
}
