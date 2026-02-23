import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  createNextPromptVersion,
  createPrompt,
  createRunningTestRun,
  deletePromptById,
  findPromptById,
  listPromptVersionsAscending,
  listTestRunsByPrompt,
  markTestRunSucceeded,
} from "@/repositories";

let databaseConnectivity: boolean | null = null;

async function hasDatabaseConnectivity() {
  if (databaseConnectivity !== null) {
    return databaseConnectivity;
  }

  try {
    await db.execute(sql`select 1`);
    databaseConnectivity = true;
  } catch {
    databaseConnectivity = false;
  }

  return databaseConnectivity;
}

describe("concurrency flows", () => {
  it("creates sequential prompt versions under concurrent saves", async (context) => {
    if (!(await hasDatabaseConnectivity())) {
      context.skip();
      return;
    }

    const createdPrompt = await createPrompt({
      title: `Concurrency prompt ${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "general",
      tags: ["concurrency"],
    });

    if (!createdPrompt) {
      throw new Error("Failed to create seed prompt for test");
    }

    try {
      const results = await Promise.all(
        [0, 1, 2].map((index) =>
          createNextPromptVersion(createdPrompt.id, `Prompt content ${index}`, `Notes ${index}`),
        ),
      );

      expect(results.every((result) => result.status === "created")).toBe(true);

      const versions = await listPromptVersionsAscending(createdPrompt.id);
      expect(versions).toHaveLength(3);
      expect(versions.map((version) => version.versionNumber)).toEqual([1, 2, 3]);

      const refreshedPrompt = await findPromptById(createdPrompt.id);
      expect(refreshedPrompt?.currentVersionId).toBe(versions[versions.length - 1]?.id ?? null);
    } finally {
      await deletePromptById(createdPrompt.id);
    }
  });

  it("persists concurrent test runs and completion updates", async (context) => {
    if (!(await hasDatabaseConnectivity())) {
      context.skip();
      return;
    }

    const createdPrompt = await createPrompt({
      title: `Run concurrency prompt ${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "general",
      tags: ["concurrency", "runs"],
    });

    if (!createdPrompt) {
      throw new Error("Failed to create seed prompt for run test");
    }

    try {
      const versionResult = await createNextPromptVersion(
        createdPrompt.id,
        "Prompt content for concurrent run test",
        "Seed version",
      );

      if (versionResult.status !== "created" || !versionResult.version) {
        throw new Error("Failed to create version for run test");
      }

      const runningRuns = await Promise.all(
        [0, 1, 2, 3].map((index) =>
          createRunningTestRun({
            promptId: createdPrompt.id,
            promptVersionId: versionResult.version.id,
            model: "gpt-4o-mini",
            params: {},
            inputVariables: {
              index,
            },
          }),
        ),
      );

      expect(runningRuns.every((run) => run && run.status === "running")).toBe(true);

      await Promise.all(
        runningRuns.map((run, index) => {
          if (!run) {
            throw new Error("Failed to create running test run");
          }

          return markTestRunSucceeded(run.id, `output-${index}`, {
            output_tokens: 10 + index,
          });
        }),
      );

      const persistedRuns = await listTestRunsByPrompt(createdPrompt.id);
      expect(persistedRuns).toHaveLength(4);
      expect(persistedRuns.every((run) => run.status === "succeeded")).toBe(true);
    } finally {
      await deletePromptById(createdPrompt.id);
    }
  });
});
