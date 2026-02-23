import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { promptVersions, prompts } from "@/db/schema";
import { apiError, apiOk } from "@/lib/api-response";

const promptIdSchema = z.string().uuid();
const restorePromptSchema = z.object({
  versionId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getPromptId(context: RouteContext) {
  const { id } = await context.params;
  const parsedId = promptIdSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  return parsedId.data;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const promptId = await getPromptId(context);

  if (!promptId) {
    return apiError("INVALID_INPUT", "Invalid prompt id", 400);
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = restorePromptSchema.safeParse(rawBody);

  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid restore payload", 400);
  }

  try {
    const [promptRow] = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.id, promptId));

    if (!promptRow) {
      return apiError("NOT_FOUND", "Prompt not found", 404);
    }

    const [targetVersion] = await db
      .select({
        id: promptVersions.id,
        promptId: promptVersions.promptId,
        versionNumber: promptVersions.versionNumber,
        content: promptVersions.content,
        notes: promptVersions.notes,
        createdAt: promptVersions.createdAt,
      })
      .from(promptVersions)
      .where(
        and(
          eq(promptVersions.id, parsed.data.versionId),
          eq(promptVersions.promptId, promptId),
        ),
      );

    if (!targetVersion) {
      return apiError("NOT_FOUND", "Version not found for prompt", 404);
    }

    const [updatedPrompt] = await db
      .update(prompts)
      .set({
        currentVersionId: targetVersion.id,
        updatedAt: new Date(),
      })
      .where(eq(prompts.id, promptId))
      .returning({
        id: prompts.id,
        title: prompts.title,
        type: prompts.type,
        tags: prompts.tags,
        currentVersionId: prompts.currentVersionId,
        createdAt: prompts.createdAt,
        updatedAt: prompts.updatedAt,
      });

    if (!updatedPrompt) {
      return apiError("NOT_FOUND", "Prompt not found", 404);
    }

    return apiOk({
      prompt: updatedPrompt,
      currentVersion: targetVersion,
    });
  } catch (error) {
    console.error("Failed to restore prompt version", error);
    return apiError("INTERNAL_ERROR", "Failed to restore prompt version", 500);
  }
}
