"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type CreatePromptResponse = {
  data: {
    id: string;
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
};

function parseTags(rawTags: string) {
  const tagList = rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(tagList));
}

export function PromptCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("general");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextType = type.trim();

    if (!nextTitle || !nextType) {
      setError("Title and type are required.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle,
          type: nextType,
          tags: parseTags(tagsInput),
        }),
      });

      const payload = (await response.json().catch(() => null)) as CreatePromptResponse | null;

      if (!response.ok || payload?.error) {
        setError(payload?.error?.message ?? "Failed to create prompt.");
        return;
      }

      setTitle("");
      setType("general");
      setTagsInput("");
      router.refresh();
    } catch {
      setError("Failed to create prompt.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="prompt-title">
          Title
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="prompt-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Release notes summarizer"
          required
          value={title}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="prompt-type">
          Type
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="prompt-type"
          onChange={(event) => setType(event.target.value)}
          placeholder="general"
          required
          value={type}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="prompt-tags">
          Tags
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="prompt-tags"
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="summarization, docs"
          value={tagsInput}
        />
        <p className="text-xs text-muted-foreground">Comma-separated optional tags.</p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={isLoading} type="submit">
        {isLoading ? "Creating..." : "Create prompt"}
      </Button>
    </form>
  );
}
