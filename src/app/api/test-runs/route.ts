import OpenAI from "openai";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { promptVersions, prompts, testRuns } from "@/db/schema";
import { env } from "@/env";
import { apiError, apiOk } from "@/lib/api-response";
import { CORRELATION_ID_HEADER, getOrCreateCorrelationIdFromHeaders } from "@/lib/correlation-id";
import { logger } from "@/lib/logger";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const testRunQuerySchema = z.object({
  promptId: z.string().uuid(),
});

const testRunParamsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().positive().max(8192).optional(),
});

const createTestRunSchema = z.object({
  promptId: z.string().uuid(),
  promptVersionId: z.string().uuid().optional(),
  model: z.string().trim().min(1).max(120),
  params: testRunParamsSchema.optional().default({}),
  inputVariables: z.record(z.string(), z.unknown()).optional().default({}),
});

function stringifyTemplateValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function applyInputVariables(template: string, inputVariables: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (!(key in inputVariables)) {
      return match;
    }

    return stringifyTemplateValue(inputVariables[key]);
  });
}

export async function GET(request: Request) {
  const correlationId = getOrCreateCorrelationIdFromHeaders(request.headers);
  const session = await auth();

  if (!session?.user) {
    return apiError("UNAUTHORIZED", "Authentication required", 401, { correlationId });
  }

  const parsedQuery = testRunQuerySchema.safeParse({
    promptId: new URL(request.url).searchParams.get("promptId"),
  });

  if (!parsedQuery.success) {
    return apiError("INVALID_INPUT", "promptId query param is required", 400, { correlationId });
  }

  try {
    const runs = await db
      .select({
        id: testRuns.id,
        promptId: testRuns.promptId,
        promptVersionId: testRuns.promptVersionId,
        status: testRuns.status,
        model: testRuns.model,
        params: testRuns.params,
        inputVariables: testRuns.inputVariables,
        output: testRuns.output,
        usage: testRuns.usage,
        error: testRuns.error,
        createdAt: testRuns.createdAt,
        updatedAt: testRuns.updatedAt,
      })
      .from(testRuns)
      .where(eq(testRuns.promptId, parsedQuery.data.promptId))
      .orderBy(desc(testRuns.createdAt));

    return apiOk(runs, { correlationId });
  } catch (error) {
    logger.error("Failed to list test runs", { correlationId, error });
    return apiError("INTERNAL_ERROR", "Failed to list test runs", 500, { correlationId });
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

  const parsed = createTestRunSchema.safeParse(rawBody);

  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid test run payload", 400, { correlationId });
  }

  const payload = parsed.data;

  try {
    const [promptRow] = await db
      .select({
        id: prompts.id,
        currentVersionId: prompts.currentVersionId,
      })
      .from(prompts)
      .where(eq(prompts.id, payload.promptId));

    if (!promptRow) {
      return apiError("NOT_FOUND", "Prompt not found", 404, { correlationId });
    }

    const targetVersionId = payload.promptVersionId ?? promptRow.currentVersionId;

    if (!targetVersionId) {
      return apiError("INVALID_INPUT", "Prompt has no version to run", 400, { correlationId });
    }

    const [versionRow] = await db
      .select({
        id: promptVersions.id,
        promptId: promptVersions.promptId,
        content: promptVersions.content,
      })
      .from(promptVersions)
      .where(eq(promptVersions.id, targetVersionId));

    if (!versionRow || versionRow.promptId !== payload.promptId) {
      return apiError("NOT_FOUND", "Prompt version not found", 404, { correlationId });
    }

    const renderedPrompt = applyInputVariables(versionRow.content, payload.inputVariables);

    const [runningRun] = await db
      .insert(testRuns)
      .values({
        promptId: payload.promptId,
        promptVersionId: versionRow.id,
        status: "running",
        model: payload.model,
        params: payload.params,
        inputVariables: payload.inputVariables,
      })
      .returning({
        id: testRuns.id,
      });

    if (!runningRun) {
      return apiError("INTERNAL_ERROR", "Failed to create test run", 500, { correlationId });
    }

    try {
      const response = await openai.responses.create(
        {
          model: payload.model,
          input: renderedPrompt,
          temperature: payload.params.temperature ?? null,
          max_output_tokens: payload.params.maxOutputTokens ?? null,
        },
        {
          headers: {
            [CORRELATION_ID_HEADER]: correlationId,
          },
        },
      );

      const [completedRun] = await db
        .update(testRuns)
        .set({
          status: "succeeded",
          output: response.output_text,
          usage: response.usage,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(testRuns.id, runningRun.id))
        .returning({
          id: testRuns.id,
          promptId: testRuns.promptId,
          promptVersionId: testRuns.promptVersionId,
          status: testRuns.status,
          model: testRuns.model,
          params: testRuns.params,
          inputVariables: testRuns.inputVariables,
          output: testRuns.output,
          usage: testRuns.usage,
          error: testRuns.error,
          createdAt: testRuns.createdAt,
          updatedAt: testRuns.updatedAt,
        });

      if (!completedRun) {
        return apiError("INTERNAL_ERROR", "Failed to finalize test run", 500, { correlationId });
      }

      return apiOk(completedRun, { status: 201, correlationId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "OpenAI request failed";

      await db
        .update(testRuns)
        .set({
          status: "failed",
          error: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(testRuns.id, runningRun.id));

      logger.error("Model invocation failed", {
        correlationId,
        error,
        promptId: payload.promptId,
        promptVersionId: versionRow.id,
        testRunId: runningRun.id,
      });
      return apiError("OPENAI_ERROR", "Model invocation failed", 502, { correlationId });
    }
  } catch (error) {
    logger.error("Failed to run prompt test", { correlationId, error });
    return apiError("INTERNAL_ERROR", "Failed to run prompt test", 500, { correlationId });
  }
}
