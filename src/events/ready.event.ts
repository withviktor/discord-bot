import type { Client } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../core/decorators/event.decorator.js";
import type { IEvent } from "../core/interfaces/event.interface.js";
import { ActivityService } from "../services/activity.service.js";
import { LoggerService } from "../services/logger.service.js";

@Event({ name: "clientReady", once: true })
export class ReadyEvent implements IEvent {
  private readonly logger: LoggerService;
  private readonly activity: ActivityService;

  constructor(
    @inject(LoggerService) logger: LoggerService,
    @inject(ActivityService) activity: ActivityService
  ) {
    this.logger = logger;
    this.activity = activity;
  }

  async execute(client: Client<true>): Promise<void> {
    this.logger.info(`Logged in as ${client.user.tag}`);
    this.activity.refresh(client);
  }
}
