import type { AgentResponse, AgentService } from './agent-service.js'

/**
 * Placeholder for the final Mastra-powered implementation.
 *
 * The interim demo uses LocalAgentService so the project runs without external
 * API keys. In the final phase this class can wrap a Mastra agent and implement
 * the same AgentService contract used by the Express API.
 */
export class MastraAgentService implements AgentService {
  async generateResponse(query: string): Promise<AgentResponse> {
    throw new Error(
      `MastraAgentService is planned for the final phase. Received query: ${query}`,
    )
  }
}
