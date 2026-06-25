import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { env, pipeline } from '@huggingface/transformers'

export const embeddingModel = 'Xenova/all-MiniLM-L6-v2'

env.allowRemoteModels = true
env.allowLocalModels = true
env.useFSCache = true
env.cacheDir = resolve('.cache', 'transformers')

type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline<'feature-extraction'>>>

export class LocalEmbeddingService {
  private extractor?: FeatureExtractionPipeline

  async embed(text: string) {
    const extractor = await this.getExtractor()
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })

    return Array.from(output.data as Float32Array)
  }

  async dispose() {
    await this.extractor?.dispose()
    this.extractor = undefined
  }

  private async getExtractor() {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', embeddingModel, {
        dtype: 'q8',
      })
    }

    return this.extractor
  }
}

export function createKnowledgeEmbeddingText(input: {
  title: string
  category: string
  content: string
}) {
  return `Title: ${input.title}\nCategory: ${input.category}\nContent: ${input.content}`
}

export function createContentHash(text: string) {
  return createHash('sha256').update(text).digest('hex')
}
