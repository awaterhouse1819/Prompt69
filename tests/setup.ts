import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

process.env.DATABASE_URL ??= "postgresql://annawaterhouse@localhost:5432/prompt69";
process.env.AUTH_SECRET ??= "replace-with-a-32-char-minimum-secret-value";
process.env.AUTH_ADMIN_EMAIL ??= "admin@example.com";
process.env.AUTH_ADMIN_PASSWORD ??= "change-me-in-staging";
process.env.OPENAI_API_KEY ??= "test-key";
