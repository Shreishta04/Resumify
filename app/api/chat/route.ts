import { NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import { CHAT_SYSTEM_PROMPT } from '@/lib/prompts';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { latex, message } = await req.json();

    if (!latex || !message) {
      return new Response(JSON.stringify({ error: 'Missing latex or message' }), { status: 400 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const stream = await groq.chat.completions.create({
      // 70B model is far better at preserving the full document structure than 8B,
      // which tended to drop the body and return only the preamble.
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CURRENT LATEX:\n\n${latex}\n\nMESSAGE: ${message}`,
        },
      ],
      stream: true,
      max_tokens: 4000,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err: unknown) {
    console.error('Chat error:', err);
    const status = (err as { status?: number }).status;
    const msg = err instanceof Error ? err.message : '';
    if (status === 413 || /too large|tokens per minute|rate_limit/i.test(msg)) {
      return new Response(
        JSON.stringify({ error: 'Your resume is a bit long for the free AI tier right now — wait a minute and try again, or make a smaller edit.' }),
        { status: 429 }
      );
    }
    if (status === 429) {
      return new Response(JSON.stringify({ error: 'AI is busy — try again in a moment' }), { status: 429 });
    }
    return new Response(JSON.stringify({ error: 'Chat failed' }), { status: 500 });
  }
}
