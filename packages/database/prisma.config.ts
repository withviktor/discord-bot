import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env lives at the workspace root (two levels up from packages/database/)
config({ path: path.join(__dirname, "../../.env") });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  schema: path.join(__dirname, "prisma", "schema"),
});
