import { desc } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { prompts } from "@/db/schema";
import { apiError, apiOk } from "@/lib/api-response";
import { getOrCreateCorrelationIdFromHeaders } from "@/lib/correlation-id";
import { logger } from "@/lib/logger";

const createPromptSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    type: z.string().trim().min(1).max(100),
    tags: z.array(z.string().trim().min(1).max(64)).max(25).optional().default([]),
  })
  .transform((data) => ({
    ...data,
    tags: Array.from(new Set(data.tags)),
  }));

export async function GET(request: Request) {
  const correlationId = getOrCreateCorrelationIdFromHeaders(request.headers);
  const session = await auth();

  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
  }

  try {
    const promptList = await db
      .select({
        id: prompts.id,
        title: prompts.title,
        type: prompts.type,
        tags: prompts.tags,
        currentVersionId: prompts.currentVersionId,
        createdAt: prompts.createdAt,
        updatedAt: prompts.updatedAt,
      })
      .from(prompts)
      .orderBy(desc(prompts.updatedAt));

    return apiOk(promptList, { correlationId });
  } catch (error) {
    logger.error("Failed to list prompts", { correlationId, error });
    return apiError("INTERNAL_ERROR", "Failed to list prompts", 500, { correlationId });
  }
}

export async function POST(request: Request) {
  const correlationId = getOrCreateCorrelationIdFromHeaders(request.headers);
  const session = await auth();

  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400, { correlationId });
  }

  const parsed = createPromptSchema.safeParse(rawBody);

  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid prompt payload", 400, { correlationId });
  }

  const { title, type, tags } = parsed.data;

  try {
    const [createdPrompt] = await db
      .insert(prompts)
      .values({
        title,
        type,
        tags,
      })
      .returning({
        id: prompts.id,
        title: prompts.title,
        type: prompts.type,
        tags: prompts.tags,
        currentVersionId: prompts.currentVersionId,
        createdAt: prompts.createdAt,
        updatedAt: prompts.updatedAt,
      });

    if (!createdPrompt) {
      return apiError("INTERNAL_ERROR", "Failed to create prompt", 500, { correlationId });
    }

    return apiOk(createdPrompt, { status: 201, correlationId });
  } catch (error) {
    logger.error("Failed to create prompt", { correlationId, error });
    return apiError("INTERNAL_ERROR", "Failed to create prompt", 500, { correlationId });
  }
}
