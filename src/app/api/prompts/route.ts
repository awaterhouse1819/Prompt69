import { z } from "zod";

import { auth } from "@/auth";
import { apiError, apiOk } from "@/lib/api-response";
import { withApiHandler } from "@/lib/api-route";
import { createPrompt, listPromptsByUpdatedAt } from "@/repositories/prompts-repository";

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
  return withApiHandler(
    request,
    async ({ correlationId }) => {
      const session = await auth();

      if (!session?.user) {
        return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
      }

      const promptList = await listPromptsByUpdatedAt();

      return apiOk(promptList, { correlationId });
    },
    {
      route: "/api/prompts",
      method: "GET",
    },
  );
}

export async function POST(request: Request) {
  return withApiHandler(
    request,
    async ({ correlationId }) => {
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

      const createdPrompt = await createPrompt({ title, type, tags });

      if (!createdPrompt) {
        return apiError("INTERNAL_ERROR", "Failed to create prompt", 500, { correlationId });
      }

      return apiOk(createdPrompt, { status: 201, correlationId });
    },
    {
      route: "/api/prompts",
      method: "POST",
    },
  );
}
