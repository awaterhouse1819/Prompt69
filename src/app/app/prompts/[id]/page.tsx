import { desc, eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PromptEditor } from "@/components/prompts/prompt-editor";
import { db } from "@/db/client";
import { promptVersions, prompts, testRuns } from "@/db/schema";

const promptIdSchema = z.string().uuid();

type PromptPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PromptPage({ params }: PromptPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const parsedId = promptIdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const promptId = parsedId.data;

  const [promptWithCurrent] = await db
    .select({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      currentVersionId: prompts.currentVersionId,
      currentVersionRowId: promptVersions.id,
      currentVersionNumber: promptVersions.versionNumber,
      currentVersionContent: promptVersions.content,
      currentVersionNotes: promptVersions.notes,
      currentVersionCreatedAt: promptVersions.createdAt,
    })
    .from(prompts)
    .leftJoin(promptVersions, eq(prompts.currentVersionId, promptVersions.id))
    .where(eq(prompts.id, promptId));

  if (!promptWithCurrent) {
    notFound();
  }

  const versions = await db
    .select({
      id: promptVersions.id,
      versionNumber: promptVersions.versionNumber,
      content: promptVersions.content,
      notes: promptVersions.notes,
      createdAt: promptVersions.createdAt,
    })
    .from(promptVersions)
    .where(eq(promptVersions.promptId, promptId))
    .orderBy(desc(promptVersions.versionNumber));

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
    .where(eq(testRuns.promptId, promptId))
    .orderBy(desc(testRuns.createdAt));

  const currentVersion =
    promptWithCurrent.currentVersionRowId &&
    promptWithCurrent.currentVersionNumber !== null &&
    promptWithCurrent.currentVersionContent !== null &&
    promptWithCurrent.currentVersionCreatedAt !== null
      ? {
          id: promptWithCurrent.currentVersionRowId,
          versionNumber: promptWithCurrent.currentVersionNumber,
          content: promptWithCurrent.currentVersionContent,
          notes: promptWithCurrent.currentVersionNotes,
          createdAt: promptWithCurrent.currentVersionCreatedAt.toISOString(),
        }
      : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <a className="text-sm text-muted-foreground hover:underline" href="/app">
            Back to prompt list
          </a>
          <h1 className="mt-1 text-xl font-semibold">{promptWithCurrent.title}</h1>
          <p className="text-sm text-muted-foreground">
            Type: {promptWithCurrent.type}
            {promptWithCurrent.tags.length > 0 ? ` • Tags: ${promptWithCurrent.tags.join(", ")}` : ""}
          </p>
        </div>
        <SignOutButton />
      </header>
      <PromptEditor
        currentVersion={currentVersion}
        initialRuns={runs.map((run) => ({
          id: run.id,
          promptId: run.promptId,
          promptVersionId: run.promptVersionId,
          status: run.status,
          model: run.model,
          params: run.params,
          inputVariables: run.inputVariables,
          output: run.output,
          usage: run.usage,
          error: run.error,
          createdAt: run.createdAt.toISOString(),
          updatedAt: run.updatedAt.toISOString(),
        }))}
        prompt={{
          id: promptWithCurrent.id,
          title: promptWithCurrent.title,
          type: promptWithCurrent.type,
          tags: promptWithCurrent.tags,
          currentVersionId: promptWithCurrent.currentVersionId,
        }}
        versions={versions.map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          content: version.content,
          notes: version.notes,
          createdAt: version.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
