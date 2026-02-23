import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import dotenv from "dotenv";

function fail(message) {
  console.error(`[setup] ${message}`);
  process.exit(1);
}

const root = process.cwd();
const envLocalPath = resolve(root, ".env.local");

if (!existsSync(envLocalPath)) {
  fail("Missing .env.local. Copy .env.example to .env.local and fill required values first.");
}

const parsedEnv = dotenv.parse(readFileSync(envLocalPath, "utf8"));
const requiredEnvKeys = ["DATABASE_URL", "AUTH_SECRET", "AUTH_ADMIN_EMAIL", "AUTH_ADMIN_PASSWORD"];
const missingEnvKeys = requiredEnvKeys.filter((key) => {
  const value = process.env[key] ?? parsedEnv[key];
  return !value || value.trim().length === 0;
});

if (missingEnvKeys.length > 0) {
  fail(`Missing required env keys: ${missingEnvKeys.join(", ")}`);
}

for (const key of requiredEnvKeys) {
  if (!process.env[key]) {
    process.env[key] = parsedEnv[key];
  }
}

console.log("[setup] Runtime precheck already passed. .env.local keys validated.");
console.log("[setup] Running database migrations...");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const migrate = spawnSync(npmCommand, ["run", "db:migrate"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (migrate.status !== 0) {
  fail("Database migration failed. Resolve the error above and rerun npm run setup.");
}

console.log("[setup] Setup complete.");
