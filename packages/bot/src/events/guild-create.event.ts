import type { Guild } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../core/decorators/event.decorator.js";
import type { IEvent } from "../core/interfaces/event.interface.js";
import { GuildService } from "../modules/guild/guild.service.js";
import { ActivityService } from "../services/activity.service.js";

@Event({ name: "guildCreate" })
export class GuildCreateEvent implements IEvent {
  private readonly guildService: GuildService;
  private readonly activity: ActivityService;

  constructor(
    @inject(GuildService) guildService: GuildService,
    @inject(ActivityService) activity: ActivityService
  ) {
    this.guildService = guildService;
    this.activity = activity;
  }

  async execute(guild: Guild): Promise<void> {
    await this.guildService.upsert(guild);
    this.activity.refresh(guild.client);
  }
}
