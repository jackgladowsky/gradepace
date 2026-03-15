import { getSession } from "@/lib/session";
import { getAIClient, AI_MODEL } from "@/lib/ai";
import { NextRequest } from "next/server";

function buildChecklistPrompt(assignment: {
  courseName: string;
  name: string;
  dueAt: string | null;
  pointsPossible: number | null;
  description: string | null;
  rubric?: { description: string; points: number; long_description?: string }[];
}) {
  const rubricText = assignment.rubric
    ? assignment.rubric
        .map(
          (r) =>
            `- ${r.description} (${r.points} pts)${r.long_description ? `: ${r.long_description}` : ""}`
        )
        .join("\n")
    : "No rubric provided";

  return `You are a study assistant. Break down this assignment into a clear, actionable checklist of steps a student should complete. Each step should be specific and concise (under 80 characters).

Course: ${assignment.courseName}
Assignment: ${assignment.name}
Due: ${assignment.dueAt || "No due date"}
Points: ${assignment.pointsPossible ?? "Ungraded"}
Description: ${assignment.description || "No description provided"}
Rubric:
${rubricText}

Respond ONLY with a JSON array of strings, each string being one checklist step. Example:
["Read the assignment prompt carefully", "Research topic X", "Write outline", "Write first draft", "Proofread and submit"]

Return between 4 and 12 steps. Do not include any other text, just the JSON array.`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.canvasToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const prompt = buildChecklistPrompt(body);

  const client = getAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim() || "[]";

    // Parse the JSON array from the response
    // Handle cases where the model wraps it in markdown code blocks
    let cleaned = content;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const steps: string[] = JSON.parse(cleaned);

    if (!Array.isArray(steps) || steps.length === 0) {
      return Response.json({ error: "Failed to parse steps" }, { status: 500 });
    }

    return Response.json({ steps });
  } catch (e) {
    console.error("Checklist generation error:", e);
    return Response.json(
      { error: "Failed to generate checklist" },
      { status: 500 }
    );
  }
}
