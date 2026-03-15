import { getSession } from "@/lib/session";
import { getAIClient, AI_MODEL, buildAnalyzePrompt } from "@/lib/ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.canvasToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const prompt = buildAnalyzePrompt(body);

  const client = getAIClient();

  const stream = await client.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
