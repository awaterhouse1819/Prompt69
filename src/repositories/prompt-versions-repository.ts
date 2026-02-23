import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { promptVersions, prompts } from "@/db/schema";

export type PromptVersionRow = typeof promptVersions.$inferSelect;

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: string }).code === "23505";
}

export async function listPromptVersions(promptId: string) {
  return db
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
}

export async function listPromptVersionsAscending(promptId: string) {
  return db
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
    .orderBy(asc(promptVersions.versionNumber));
}

export async function findPromptVersionById(versionId: string) {
  const [versionRow] = await db
    .select({
      id: promptVersions.id,
      promptId: promptVersions.promptId,
      versionNumber: promptVersions.versionNumber,
      content: promptVersions.content,
      notes: promptVersions.notes,
      createdAt: promptVersions.createdAt,
    })
    .from(promptVersions)
    .where(eq(promptVersions.id, versionId));

  return versionRow ?? null;
}

export async function findPromptVersionForPrompt(promptId: string, versionId: string) {
  const [versionRow] = await db
    .select({
      id: promptVersions.id,
      promptId: promptVersions.promptId,
      versionNumber: promptVersions.versionNumber,
      content: promptVersions.content,
      notes: promptVersions.notes,
      createdAt: promptVersions.createdAt,
    })
    .from(promptVersions)
    .where(eq(promptVersions.id, versionId));

  if (!versionRow || versionRow.promptId !== promptId) {
    return null;
  }

  return versionRow;
}

export async function createNextPromptVersion(promptId: string, content: string, notes: string | null) {
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
            content,
            notes,
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
        return { status: "not_found" as const, version: null };
      }

      return { status: "created" as const, version: createdVersion };
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) {
        continue;
      }

      if (isUniqueViolation(error)) {
        return { status: "conflict" as const, version: null };
      }

      throw error;
    }
  }

  return { status: "conflict" as const, version: null };
}
