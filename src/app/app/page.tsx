import { desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PromptCreateForm } from "@/components/prompts/prompt-create-form";
import { db } from "@/db/client";
import { prompts } from "@/db/schema";

export default async function AppPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const promptList = await db
    .select({
      id: prompts.id,
      title: prompts.title,
      type: prompts.type,
      tags: prompts.tags,
      updatedAt: prompts.updatedAt,
    })
    .from(prompts)
    .orderBy(desc(prompts.updatedAt));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{session.user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-2xl font-semibold">Create Prompt</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a prompt record with title, type, and optional tags.
          </p>
          <div className="mt-6">
            <PromptCreateForm />
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold">Prompt Library</h2>
            <p className="text-xs text-muted-foreground">
              {promptList.length} {promptList.length === 1 ? "prompt" : "prompts"}
            </p>
          </div>
          {promptList.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No prompts yet. Create your first prompt.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {promptList.map((prompt) => (
                <li className="rounded-md border p-3" key={prompt.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link className="font-medium hover:underline" href={`/app/prompts/${prompt.id}`}>
                        {prompt.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">Type: {prompt.type}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Updated {prompt.updatedAt.toLocaleString()}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {prompt.tags.length > 0 ? prompt.tags.join(", ") : "No tags"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
