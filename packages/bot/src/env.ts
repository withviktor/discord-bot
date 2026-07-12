import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// .env lives at the workspace root — three levels above packages/bot/src/env.ts
config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

export const env = createEnv({
  server: {
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().url(),
    // Optional: set to a positive integer to fix the shard count, or omit to let Discord auto-assign.
    TOTAL_SHARDS: z
      .union([z.coerce.number().positive().int(), z.literal("auto")])
      .optional(),
    // Staff ticket system — the guild/channel where reports are posted to your team.
    SUPPORT_GUILD_ID: z.string().optional(),
    SUPPORT_CHANNEL_ID: z.string().optional(),
  },
  runtimeEnv: process.env,
});
