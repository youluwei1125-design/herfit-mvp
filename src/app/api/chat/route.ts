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
const API_TIMEOUT_MS = 15_000;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY missing');
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

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Claude API 请求超时')), timeoutMs);
    }),
  ]);
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
    const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

    console.log('[HerFit API] /api/chat called');
    console.log('[HerFit API] has ANTHROPIC_API_KEY:', hasApiKey);
    console.log('[HerFit API] request payload:', {
      messageCount: body.messages?.length ?? 0,
      hasSystemPrompt: Boolean(body.systemPrompt),
      maxTokens: body.maxTokens ?? 16384,
      temperature: body.temperature ?? 0.4,
      firstMessagePreview: body.messages?.[0]?.content?.toString().slice(0, 500),
    });

    const { messages, systemPrompt } = body;

    if (!systemPrompt || !messages || messages.length === 0) {
      console.log('[HerFit API] AI response failure:', '请求缺少 systemPrompt 或 messages');
      return NextResponse.json({ error: '请求缺少 systemPrompt 或 messages' }, { status: 400 });
    }

    if (!hasApiKey) {
      console.error('ANTHROPIC_API_KEY missing');
      console.error('[HerFit API] fallback reason:', '缺少 ANTHROPIC_API_KEY 环境变量');
      return NextResponse.json({ error: '缺少 ANTHROPIC_API_KEY 环境变量' }, { status: 500 });
    }

    const client = getClient();
    const response = await withTimeout(
      retry(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: body.maxTokens ?? 16384,
          temperature: body.temperature ?? 0.4,
          system: systemPrompt,
          messages,
        }),
      ),
      API_TIMEOUT_MS,
    );
    const text = extractText(response);

    console.log('[HerFit API] AI response success:', {
      model: response.model,
      id: response.id,
      textLength: text.length,
    });

    return NextResponse.json({
      text,
      model: response.model,
      id: response.id,
      usage: response.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Claude API 调用失败';
    const details = error as { status?: number; response?: { status?: number }; error?: unknown };
    console.error('[HerFit API] AI response failure:', {
      message,
      status: details.status ?? details.response?.status,
      error: details.error,
    });
    console.error('[HerFit API] fallback reason:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
