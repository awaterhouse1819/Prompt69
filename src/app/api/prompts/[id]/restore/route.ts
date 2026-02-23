import { z } from "zod";

import { auth } from "@/auth";
import { apiError, apiOk } from "@/lib/api-response";
import { withApiHandler } from "@/lib/api-route";
import { findPromptById, findPromptVersionForPrompt, setPromptCurrentVersion } from "@/repositories";

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

      const parsed = restorePromptSchema.safeParse(rawBody);

      if (!parsed.success) {
        return apiError("INVALID_INPUT", "Invalid restore payload", 400, { correlationId });
      }

      const promptRow = await findPromptById(promptId);

      if (!promptRow) {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      const targetVersion = await findPromptVersionForPrompt(promptId, parsed.data.versionId);

      if (!targetVersion) {
        return apiError("NOT_FOUND", "Version not found for prompt", 404, { correlationId });
      }

      const updatedPrompt = await setPromptCurrentVersion(promptId, targetVersion.id);

      if (!updatedPrompt) {
        return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
      }

      return apiOk(
        {
          prompt: updatedPrompt,
          currentVersion: targetVersion,
        },
        { correlationId },
      );
    },
    {
      route: "/api/prompts/[id]/restore",
      method: "POST",
    },
  );
}
