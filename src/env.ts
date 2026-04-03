import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

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
  },
  runtimeEnv: process.env,
});
