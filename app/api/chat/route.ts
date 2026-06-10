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
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Current LaTeX:\n\n${latex}\n\nInstruction: ${message}`,
        },
      ],
      stream: true,
      // Groq free tier caps at 6000 tokens/min (input + output combined).
      // A full resume input is ~2500 tokens, so keep output headroom under that.
      max_tokens: 3000,
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
