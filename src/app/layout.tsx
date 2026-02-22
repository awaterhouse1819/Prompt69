import type { Metadata } from "next";

import "@/app/globals.css";
import "@/env";

export const metadata: Metadata = {
  title: "PromptRefine",
  description: "PromptRefine monolith foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
