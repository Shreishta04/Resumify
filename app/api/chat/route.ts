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
      max_tokens: 4096,
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
    if (status === 429) {
      return new Response(JSON.stringify({ error: 'AI is busy — try again in a moment' }), { status: 429 });
    }
    return new Response(JSON.stringify({ error: 'Chat failed' }), { status: 500 });
  }
}
