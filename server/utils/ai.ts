import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const { openaiApiKey } = useRuntimeConfig()
    if (!openaiApiKey) {
      throw new Error('[openai] NUXT_OPENAI_API_KEY is not set. Embeddings require an OpenAI API key.')
    }
    openaiClient = new OpenAI({ apiKey: openaiApiKey })
  }
  return openaiClient
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const { anthropicApiKey } = useRuntimeConfig()
    if (!anthropicApiKey) {
      throw new Error('[anthropic] NUXT_ANTHROPIC_API_KEY is not set. Content moderation requires an Anthropic API key.')
    }
    anthropicClient = new Anthropic({ apiKey: anthropicApiKey })
  }
  return anthropicClient
}

export async function chatJson<T>(opts: {
  system: string
  user: string
  schema: Record<string, unknown>
  context?: string
}): Promise<T> {
  const res = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: opts.schema,
      },
    },
  })

  const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
  if (!text) {
    throw new Error(`[chatJson] Empty response from Anthropic${opts.context ? ` (${opts.context})` : ''}`)
  }

  return JSON.parse(text) as T
}
