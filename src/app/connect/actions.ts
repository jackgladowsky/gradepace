"use server";

import { getSession } from "@/lib/session";
import { validateToken } from "@/lib/canvas";

export async function connect(formData: FormData) {
  const canvasUrl = (formData.get("canvasUrl") as string)?.trim().replace(/\/+$/, "");
  const canvasToken = (formData.get("canvasToken") as string)?.trim();

  if (!canvasUrl || !canvasToken) {
    return { error: "Canvas URL and API token are required." };
  }

  try {
    const profile = await validateToken(canvasUrl, canvasToken);
    const session = await getSession();
    session.canvasUrl = canvasUrl;
    session.canvasToken = canvasToken;
    session.userName = profile.short_name || profile.name;
    await session.save();
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("401")) {
      return { error: "Invalid API token. Please check and try again." };
    }
    if (message.includes("fetch")) {
      return { error: "Could not reach Canvas. Please check your URL." };
    }
    return { error: `Connection failed: ${message}` };
  }
}

export async function disconnect() {
  const session = await getSession();
  session.destroy();
}
