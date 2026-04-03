import type { Client } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../core/decorators/event.decorator.js";
import type { IEvent } from "../core/interfaces/event.interface.js";
import { LoggerService } from "../services/logger.service.js";

@Event({ name: "clientReady", once: true })
export class ReadyEvent implements IEvent {
  private readonly logger: LoggerService;

  constructor(@inject(LoggerService) logger: LoggerService) {
    this.logger = logger;
  }

  async execute(client: Client<true>): Promise<void> {
    this.logger.info(`Logged in as ${client.user.tag}`);
  }
}
