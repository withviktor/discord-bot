import { Module } from "./core/decorators/module.decorator.js";
import { GuildCreateEvent } from "./events/guild-create.event.js";
import { GuildDeleteEvent } from "./events/guild-delete.event.js";
import { ReadyEvent } from "./events/ready.event.js";
import { GuildModule } from "./modules/guild/guild.module.js";
import { PingModule } from "./modules/ping/ping.module.js";
import { ActivityService } from "./services/activity.service.js";
import { LoggerService } from "./services/logger.service.js";
import { PrismaService } from "./services/prisma.service.js";

@Module({
  imports: [PingModule, GuildModule],
  events: [ReadyEvent, GuildCreateEvent, GuildDeleteEvent],
  providers: [ActivityService, LoggerService, PrismaService],
})
export class AppModule {}
