import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const { openaiApiKey } = useRuntimeConfig()
    if (!openaiApiKey) {
      throw new Error('[openai] NUXT_OPENAI_API_KEY is not set. Content moderation requires an OpenAI API key.')
    }
    client = new OpenAI({ apiKey: openaiApiKey })
  }
  return client
}

export async function chatJson<T>(opts: {
  system: string
  user: string
  context?: string
}): Promise<T> {
  const userInput = `Return a valid JSON object only.\n\n${opts.user}`

  const res = await getClient().responses.create({
    model: 'gpt-5-nano',
    instructions: opts.system + '\nRespond with JSON.',
    input: userInput,
    text: { format: { type: 'json_object' } },
  })

  const text = res.output_text
  if (!text) {
    throw new Error(`[chatJson] Empty response from OpenAI${opts.context ? ` (${opts.context})` : ''}`)
  }

  try {
    return JSON.parse(text) as T
  }
  catch {
    console.error(`[chatJson] Failed to parse AI response${opts.context ? ` (${opts.context})` : ''}:`, text)
    throw new Error(`[chatJson] Invalid JSON from AI${opts.context ? ` (${opts.context})` : ''}`)
  }
}
