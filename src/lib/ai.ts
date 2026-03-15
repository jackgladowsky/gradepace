import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

export function getAIClient() {
  return client;
}

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function buildAnalyzePrompt(assignment: {
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

  return `You are a study assistant. Be concise and practical.

Here's an assignment from my ${assignment.courseName} class:
Title: ${assignment.name}
Due: ${assignment.dueAt || "No due date"}
Points: ${assignment.pointsPossible ?? "Ungraded"}
Description: ${assignment.description || "No description provided"}
Rubric:
${rubricText}

Give me:
1. What's actually being asked (2-3 sentences)
2. Key requirements to hit
3. Suggested approach
4. Estimated time
5. Common mistakes to avoid`;
}
