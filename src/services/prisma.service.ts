import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { inject, injectable } from "tsyringe";
import type { OnBotDestroy, OnBotInit } from "../core/interfaces/lifecycle.interface.js";
import { env } from "../env.js";
import { LoggerService } from "./logger.service.js";

@injectable()
export class PrismaService implements OnBotInit, OnBotDestroy {
  public readonly client: PrismaClient;
  private readonly logger: LoggerService;

  constructor(@inject(LoggerService) logger: LoggerService) {
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
    this.logger = logger;
  }

  async onInit(): Promise<void> {
    await this.client.$connect();
    this.logger.info("Database connected.");
  }

  async onDestroy(): Promise<void> {
    await this.client.$disconnect();
    this.logger.info("Database disconnected.");
  }
}
