import { config } from "dotenv";
import { Pool } from "pg";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

const requiredEnvKeys = ["DATABASE_URL", "AUTH_ADMIN_EMAIL"];

for (const key of requiredEnvKeys) {
  if (!process.env[key] || process.env[key].trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const seedPrompt = {
  title: "Getting Started Prompt",
  type: "general",
  tags: ["seed", "example"],
  content:
    "You are a coding assistant. Summarize the following code changes: {{changes}}",
  notes: "Initial seeded version",
};

async function runSeed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        INSERT INTO users (email, name)
        VALUES ($1, $2)
        ON CONFLICT (email)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id, email
      `,
      [process.env.AUTH_ADMIN_EMAIL, "PromptRefine Admin"],
    );

    const promptLookup = await client.query(
      `
        SELECT id, current_version_id
        FROM prompts
        WHERE title = $1 AND type = $2
        LIMIT 1
      `,
      [seedPrompt.title, seedPrompt.type],
    );

    let promptId;
    let currentVersionId;

    if (promptLookup.rowCount && promptLookup.rows[0]) {
      promptId = promptLookup.rows[0].id;
      currentVersionId = promptLookup.rows[0].current_version_id;
    } else {
      const createdPrompt = await client.query(
        `
          INSERT INTO prompts (title, type, tags)
          VALUES ($1, $2, $3::text[])
          RETURNING id, current_version_id
        `,
        [seedPrompt.title, seedPrompt.type, seedPrompt.tags],
      );

      promptId = createdPrompt.rows[0].id;
      currentVersionId = createdPrompt.rows[0].current_version_id;
    }

    const versionCountResult = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM prompt_versions
        WHERE prompt_id = $1
      `,
      [promptId],
    );

    const existingVersionCount = versionCountResult.rows[0]?.count ?? 0;

    if (existingVersionCount === 0) {
      const createdVersion = await client.query(
        `
          INSERT INTO prompt_versions (prompt_id, version_number, content, notes)
          VALUES ($1, 1, $2, $3)
          RETURNING id
        `,
        [promptId, seedPrompt.content, seedPrompt.notes],
      );

      currentVersionId = createdVersion.rows[0].id;

      await client.query(
        `
          UPDATE prompts
          SET current_version_id = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [currentVersionId, promptId],
      );
    }

    await client.query("COMMIT");

    const seededUser = userResult.rows[0];
    console.log(
      `[seed] user=${seededUser.email} prompt_id=${promptId} current_version_id=${currentVersionId ?? "null"}`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

runSeed()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
