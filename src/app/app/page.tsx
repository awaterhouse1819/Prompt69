import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AppPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{session.user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <section className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold">PromptRefine v1 Foundation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Next.js App Router, Tailwind + shadcn baseline, Drizzle PostgreSQL schema, Auth.js single-user
          credentials, and startup env validation are configured.
        </p>
      </section>
    </main>
  );
}
