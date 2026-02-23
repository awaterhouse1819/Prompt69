"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type VersionSummary = {
  id: string;
  versionNumber: number;
  content: string;
  notes: string | null;
  createdAt: string;
};

type PromptSummary = {
  id: string;
  title: string;
  type: string;
  tags: string[];
  currentVersionId: string | null;
};

type TestRunSummary = {
  id: string;
  promptId: string;
  promptVersionId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  model: string;
  params: unknown;
  inputVariables: unknown;
  output: string | null;
  usage: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type PromptEditorProps = {
  prompt: PromptSummary;
  currentVersion: VersionSummary | null;
  versions: VersionSummary[];
  initialRuns: TestRunSummary[];
};

type ApiResponse<T> = {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
};

export function PromptEditor({ prompt, currentVersion, versions, initialRuns }: PromptEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(currentVersion?.content ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [model, setModel] = useState("gpt-4o-mini");
  const [isRunning, setIsRunning] = useState(false);
  const [runHistory, setRunHistory] = useState(initialRuns);

  const currentVersionId = useMemo(() => prompt.currentVersionId, [prompt.currentVersionId]);

  async function onSaveVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (content.trim().length === 0) {
      setError("Prompt content is required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/prompts/${prompt.id}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          notes: notes.trim().length > 0 ? notes.trim() : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse<{ id: string }> | null;

      if (!response.ok || payload?.error) {
        setError(payload?.error?.message ?? "Failed to save version.");
        return;
      }

      setNotes("");
      router.refresh();
    } catch {
      setError("Failed to save version.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onRestoreVersion(versionId: string) {
    setError(null);
    setRestoringVersionId(versionId);

    try {
      const response = await fetch(`/api/prompts/${prompt.id}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          versionId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse<{ prompt: PromptSummary }> | null;

      if (!response.ok || payload?.error) {
        setError(payload?.error?.message ?? "Failed to restore version.");
        return;
      }

      const restoredVersion = versions.find((version) => version.id === versionId);

      if (restoredVersion) {
        setContent(restoredVersion.content);
      }

      router.refresh();
    } catch {
      setError("Failed to restore version.");
    } finally {
      setRestoringVersionId(null);
    }
  }

  function onLoadVersion(version: VersionSummary) {
    setContent(version.content);
    setNotes(version.notes ?? "");
  }

  async function onRunPrompt() {
    setError(null);

    if (!prompt.currentVersionId) {
      setError("Save at least one version before running a test.");
      return;
    }

    const selectedModel = model.trim();

    if (!selectedModel) {
      setError("Model is required.");
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch("/api/test-runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptId: prompt.id,
          promptVersionId: prompt.currentVersionId,
          model: selectedModel,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse<TestRunSummary> | null;

      if (!response.ok || payload?.error) {
        setError(payload?.error?.message ?? "Failed to run prompt.");
        return;
      }

      const createdRun = payload?.data;

      if (createdRun) {
        setRunHistory((previous) => [createdRun, ...previous]);
      }
    } catch {
      setError("Failed to run prompt.");
    } finally {
      setIsRunning(false);
    }
  }

  function stringifyJson(value: unknown) {
    if (!value) {
      return "";
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold">Editor</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Current version: {currentVersion ? `v${currentVersion.versionNumber}` : "none yet"}
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSaveVersion}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="version-content">
                Prompt content
              </label>
              <textarea
                className="min-h-[260px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="version-content"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write prompt content..."
                value={content}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="version-notes">
                Version notes
              </label>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="version-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What changed in this version?"
                value={notes}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save as new version"}
            </Button>
          </form>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold">Version History</h2>
          {versions.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No versions yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {versions.map((version) => {
                const isCurrent = currentVersionId === version.id;

                return (
                  <li className="rounded-md border p-3" key={version.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">v{version.versionNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(version.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="rounded bg-secondary px-2 py-1 text-xs">Current</span>
                      ) : null}
                    </div>
                    {version.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground">{version.notes}</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No notes</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => onLoadVersion(version)} size="sm" type="button" variant="outline">
                        Load
                      </Button>
                      <Button
                        disabled={isCurrent || restoringVersionId === version.id}
                        onClick={() => onRestoreVersion(version.id)}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        {restoringVersionId === version.id ? "Restoring..." : "Restore"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Test Runs</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium" htmlFor="run-model">
              Model
            </label>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="run-model"
              list="model-options"
              onChange={(event) => setModel(event.target.value)}
              placeholder="gpt-4o-mini"
              value={model}
            />
            <datalist id="model-options">
              <option value="gpt-4o-mini" />
              <option value="gpt-4.1-mini" />
              <option value="gpt-4.1" />
            </datalist>
          </div>
          <Button disabled={isRunning || !prompt.currentVersionId} onClick={onRunPrompt} type="button">
            {isRunning ? "Running..." : "Run prompt"}
          </Button>
        </div>
        {!prompt.currentVersionId ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Save or restore a version before running this prompt.
          </p>
        ) : null}
        {runHistory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No test runs yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {runHistory.map((run) => (
              <li className="rounded-md border p-3" key={run.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {run.model} • {run.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Version ID: {run.promptVersionId}</p>
                </div>
                {run.output ? <p className="mt-2 whitespace-pre-wrap text-sm">{run.output}</p> : null}
                {run.error ? <p className="mt-2 text-sm text-destructive">{run.error}</p> : null}
                {run.usage ? (
                  <p className="mt-2 break-all text-xs text-muted-foreground">Usage: {stringifyJson(run.usage)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
