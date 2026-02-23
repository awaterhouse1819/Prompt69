import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { testRuns } from "@/db/schema";

export async function listTestRunsByPrompt(promptId: string) {
  return db
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
    .where(eq(testRuns.promptId, promptId))
    .orderBy(desc(testRuns.createdAt));
}

export async function createRunningTestRun(input: {
  promptId: string;
  promptVersionId: string;
  model: string;
  params: Record<string, unknown>;
  inputVariables: Record<string, unknown>;
}) {
  const [runningRun] = await db
    .insert(testRuns)
    .values({
      promptId: input.promptId,
      promptVersionId: input.promptVersionId,
      status: "running",
      model: input.model,
      params: input.params,
      inputVariables: input.inputVariables,
    })
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

  return runningRun ?? null;
}

export async function markTestRunSucceeded(testRunId: string, output: string, usage: unknown) {
  const [completedRun] = await db
    .update(testRuns)
    .set({
      status: "succeeded",
      output,
      usage: usage as Record<string, unknown>,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(testRuns.id, testRunId))
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

  return completedRun ?? null;
}

export async function markTestRunFailed(testRunId: string, errorMessage: string) {
  const [failedRun] = await db
    .update(testRuns)
    .set({
      status: "failed",
      error: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(testRuns.id, testRunId))
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

  return failedRun ?? null;
}
