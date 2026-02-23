import { z } from "zod";

import { logger } from "@/lib/logger";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  AUTH_ADMIN_EMAIL: z.string().email(),
  AUTH_ADMIN_PASSWORD: z.string().min(8),
  OPENAI_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_ADMIN_EMAIL: process.env.AUTH_ADMIN_EMAIL,
  AUTH_ADMIN_PASSWORD: process.env.AUTH_ADMIN_PASSWORD,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  logger.error("Invalid environment variables", { fieldErrors });
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
