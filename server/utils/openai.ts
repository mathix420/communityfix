import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const { openaiApiKey } = useRuntimeConfig()
    client = new OpenAI({ apiKey: openaiApiKey })
  }
  return client
}

export async function chatJson<T>(opts: {
  system: string
  user: string
}): Promise<T> {
  const userInput = `Return a valid JSON object only.\n\n${opts.user}`

  const res = await getClient().responses.create({
    model: 'gpt-5-nano',
    instructions: opts.system + '\nRespond with JSON.',
    input: userInput,
    text: { format: { type: 'json_object' } },
  })

  const text = res.output_text
  return JSON.parse(text) as T
}
