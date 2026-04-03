import "dotenv/config";
import "reflect-metadata";
import { ShardingManager } from "discord.js";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import { LoggerService } from "./services/logger.service.js";

const logger = new LoggerService();

const self = fileURLToPath(import.meta.url);
const isTsMode = self.endsWith(".ts");

// In TS mode (tsx), spawn shards with the tsx import hook so TypeScript files run directly.
// In production (compiled JS), spawn the plain JS worker.
const workerFile = self.replace(/shard\.(ts|js)$/, `main.$1`);
const workerExecArgv = isTsMode ? ["--import", "tsx"] : [];

const manager = new ShardingManager(workerFile, {
  token: env.DISCORD_TOKEN,
  totalShards: env.TOTAL_SHARDS ?? "auto",
  execArgv: workerExecArgv,
});

manager.on("shardCreate", (shard) => {
  logger.info(`Launched shard ${shard.id}`);

  shard.on("ready", () => logger.info(`Shard ${shard.id} is ready`));
  shard.on("disconnect", () => logger.warn(`Shard ${shard.id} disconnected`));
  shard.on("reconnecting", () => logger.warn(`Shard ${shard.id} reconnecting`));
  shard.on("death", () => logger.error(`Shard ${shard.id} died`));
});

manager.spawn().catch((error) => {
  logger.error("Failed to spawn shards:", error);
  process.exit(1);
});
