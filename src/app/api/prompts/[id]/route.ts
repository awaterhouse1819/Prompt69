import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { promptVersions, prompts } from "@/db/schema";
import { apiError, apiOk } from "@/lib/api-response";
import { withApiHandler } from "@/lib/api-route";
import { deletePromptById, updatePromptById } from "@/repositories";

const promptIdSchema = z.string().uuid();

const updatePromptSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(25).optional(),
  })
  .refine((data) => data.title !== undefined || data.tags !== undefined, {
    message: "At least one field is required",
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

export async function GET(request: Request, context: RouteContext) {
  return withApiHandler(
    request,
    async ({ correlationId }) => {
      const session = await auth();

      if (!session?.user) {
        return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
      }

      const promptId = await getPromptId(context);

      if (!promptId) {
        return apiError("INVALID_INPUT", "Invalid prompt id", 400, { correlationId });
      }

      const [promptWithVersion] = await db
        .select({
          id: prompts.id,
          title: prompts.title,
          type: prompts.type,
          tags: prompts.tags,
          currentVersionId: prompts.currentVersionId,
          createdAt: prompts.createdAt,
          updatedAt: prompts.updatedAt,
          currentVersionRowId: promptVersions.id,
          currentVersionNumber: promptVersions.versionNumber,
          currentVersionContent: promptVersions.content,
          currentVersionNotes: promptVersions.notes,
          currentVersionCreatedAt: promptVersions.createdAt,
        })
        .from(prompts)
        .leftJoin(promptVersions, eq(prompts.currentVersionId, promptVersions.id))
        .where(eq(prompts.id, promptId));

      if (!promptWithVersion) {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      return apiOk(
        {
          prompt: {
            id: promptWithVersion.id,
            title: promptWithVersion.title,
            type: promptWithVersion.type,
            tags: promptWithVersion.tags,
            currentVersionId: promptWithVersion.currentVersionId,
            createdAt: promptWithVersion.createdAt,
            updatedAt: promptWithVersion.updatedAt,
          },
          currentVersion: promptWithVersion.currentVersionRowId
            ? {
                id: promptWithVersion.currentVersionRowId,
                versionNumber: promptWithVersion.currentVersionNumber,
                content: promptWithVersion.currentVersionContent,
                notes: promptWithVersion.currentVersionNotes,
                createdAt: promptWithVersion.currentVersionCreatedAt,
              }
            : null,
        },
        { correlationId },
      );
    },
    {
      route: "/api/prompts/[id]",
      method: "GET",
    },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApiHandler(
    request,
    async ({ correlationId }) => {
      const session = await auth();

      if (!session?.user) {
        return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
      }

      const promptId = await getPromptId(context);

      if (!promptId) {
        return apiError("INVALID_INPUT", "Invalid prompt id", 400, { correlationId });
      }

      let rawBody: unknown;

      try {
        rawBody = await request.json();
      } catch {
        return apiError("INVALID_JSON", "Request body must be valid JSON", 400, { correlationId });
      }

      const parsed = updatePromptSchema.safeParse(rawBody);

      if (!parsed.success) {
        return apiError("INVALID_INPUT", "Invalid prompt payload", 400, { correlationId });
      }

      const updateValues: {
        title?: string;
        tags?: string[];
      } = {};

      if (parsed.data.title !== undefined) {
        updateValues.title = parsed.data.title;
      }

      if (parsed.data.tags !== undefined) {
        updateValues.tags = Array.from(new Set(parsed.data.tags));
      }

      const updatedPrompt = await updatePromptById(promptId, updateValues);

      if (!updatedPrompt) {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      return apiOk(updatedPrompt, { correlationId });
    },
    {
      route: "/api/prompts/[id]",
      method: "PATCH",
    },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  return withApiHandler(
    request,
    async ({ correlationId }) => {
      const session = await auth();

      if (!session?.user) {
        return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
      }

      const promptId = await getPromptId(context);

      if (!promptId) {
        return apiError("INVALID_INPUT", "Invalid prompt id", 400, { correlationId });
      }

      const deletedPrompt = await deletePromptById(promptId);

      if (!deletedPrompt) {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      return apiOk(deletedPrompt, { correlationId });
    },
    {
      route: "/api/prompts/[id]",
      method: "DELETE",
    },
  );
}
