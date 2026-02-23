import { z } from "zod";

import { auth } from "@/auth";
import { apiError, apiOk } from "@/lib/api-response";
import { withApiHandler } from "@/lib/api-route";
import {
  createNextPromptVersion,
  findPromptById,
  listPromptVersions,
} from "@/repositories";

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

      const promptRow = await findPromptById(promptId);

      if (!promptRow) {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      const versions = await listPromptVersions(promptId);

      return apiOk(versions, { correlationId });
    },
    {
      route: "/api/prompts/[id]/versions",
      method: "GET",
    },
  );
}

export async function POST(request: Request, context: RouteContext) {
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

      const parsed = createPromptVersionSchema.safeParse(rawBody);

      if (!parsed.success) {
        return apiError("INVALID_INPUT", "Invalid prompt version payload", 400, { correlationId });
      }

      const normalizedNotes = parsed.data.notes?.trim();

      const createdVersionResult = await createNextPromptVersion(
        promptId,
        parsed.data.content,
        normalizedNotes && normalizedNotes.length > 0 ? normalizedNotes : null,
      );

      if (createdVersionResult.status === "not_found") {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      if (createdVersionResult.status === "conflict") {
        return apiError("CONFLICT", "Failed to create version due to a concurrent update", 409, {
          correlationId,
        });
      }

      return apiOk(createdVersionResult.version, { status: 201, correlationId });
    },
    {
      route: "/api/prompts/[id]/versions",
      method: "POST",
    },
  );
}
