import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { promptVersions, prompts } from "@/db/schema";
import { apiError, apiOk } from "@/lib/api-response";

const promptIdSchema = z.string().uuid();
const createPromptVersionSchema = z.object({
  content: z
    .string()
    .min(1)
    .refine((value) => value.trim().length > 0, { message: "Content is required" }),
  notes: z.string().max(2000).optional(),
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

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: string }).code === "23505";
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const promptId = await getPromptId(context);

  if (!promptId) {
    return apiError("INVALID_INPUT", "Invalid prompt id", 400);
  }

  try {
    const [promptRow] = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.id, promptId));

    if (!promptRow) {
      return apiError("NOT_FOUND", "Prompt not found", 404);
    }

    const versions = await db
      .select({
        id: promptVersions.id,
        promptId: promptVersions.promptId,
        versionNumber: promptVersions.versionNumber,
        content: promptVersions.content,
        notes: promptVersions.notes,
        createdAt: promptVersions.createdAt,
      })
      .from(promptVersions)
      .where(eq(promptVersions.promptId, promptId))
      .orderBy(desc(promptVersions.versionNumber));

    return apiOk(versions);
  } catch (error) {
    console.error("Failed to load prompt versions", error);
    return apiError("INTERNAL_ERROR", "Failed to load prompt versions", 500);
  }
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

  const parsed = createPromptVersionSchema.safeParse(rawBody);

  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid prompt version payload", 400);
  }

  const normalizedNotes = parsed.data.notes?.trim();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createdVersion = await db.transaction(async (tx) => {
        const [promptRow] = await tx
          .select({ id: prompts.id })
          .from(prompts)
          .where(eq(prompts.id, promptId));

        if (!promptRow) {
          return null;
        }

        const [latestVersion] = await tx
          .select({ versionNumber: promptVersions.versionNumber })
          .from(promptVersions)
          .where(eq(promptVersions.promptId, promptId))
          .orderBy(desc(promptVersions.versionNumber))
          .limit(1);

        const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

        const [insertedVersion] = await tx
          .insert(promptVersions)
          .values({
            promptId,
            versionNumber: nextVersionNumber,
            content: parsed.data.content,
            notes: normalizedNotes && normalizedNotes.length > 0 ? normalizedNotes : null,
          })
          .returning({
            id: promptVersions.id,
            promptId: promptVersions.promptId,
            versionNumber: promptVersions.versionNumber,
            content: promptVersions.content,
            notes: promptVersions.notes,
            createdAt: promptVersions.createdAt,
          });

        if (!insertedVersion) {
          throw new Error("Failed to insert prompt version");
        }

        await tx
          .update(prompts)
          .set({
            currentVersionId: insertedVersion.id,
            updatedAt: new Date(),
          })
          .where(eq(prompts.id, promptId));

        return insertedVersion;
      });

      if (!createdVersion) {
        return apiError("NOT_FOUND", "Prompt not found", 404);
      }

      return apiOk(createdVersion, { status: 201 });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) {
        continue;
      }

      if (isUniqueViolation(error)) {
        return apiError("CONFLICT", "Failed to create version due to a concurrent update", 409);
      }

      console.error("Failed to create prompt version", error);
      return apiError("INTERNAL_ERROR", "Failed to create prompt version", 500);
    }
  }

  return apiError("CONFLICT", "Failed to create version due to a concurrent update", 409);
}
