import { getOpenAIClient } from './openai'

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0]!.embedding
}
