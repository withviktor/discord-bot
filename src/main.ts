import "dotenv/config";
import "reflect-metadata";
import { AppModule } from "./app.module.js";
import { BotClient } from "./core/bot.js";

const bot = new BotClient(AppModule);

bot.bootstrap().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
