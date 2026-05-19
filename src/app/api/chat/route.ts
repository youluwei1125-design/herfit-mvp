import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ChatRequestBody {
  messages?: MessageParam[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

const MODEL = 'claude-sonnet-4-6';
const RETRY_COUNT = 1;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('缺少 ANTHROPIC_API_KEY 环境变量');
  }

  return new Anthropic({ apiKey });
}

async function retry<T>(operation: () => Promise<T>, retries = RETRY_COUNT): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    return retry(operation, retries - 1);
  }
}

function extractText(message: Message) {
  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    const { messages, systemPrompt } = body;

    if (!systemPrompt || !messages || messages.length === 0) {
      return NextResponse.json({ error: '请求缺少 systemPrompt 或 messages' }, { status: 400 });
    }

    const client = getClient();
    const response = await retry(() =>
      client.messages.create({
        model: MODEL,
        max_tokens: body.maxTokens ?? 16384,
        temperature: body.temperature ?? 0.4,
        system: systemPrompt,
        messages,
      }),
    );

    return NextResponse.json({
      text: extractText(response),
      model: response.model,
      id: response.id,
      usage: response.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Claude API 调用失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
