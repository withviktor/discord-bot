import { Module } from "./core/decorators/module.decorator.js";
import { GuildCreateEvent } from "./events/guild-create.event.js";
import { GuildDeleteEvent } from "./events/guild-delete.event.js";
import { ReadyEvent } from "./events/ready.event.js";
import { AutoModModule } from "./modules/automod/automod.module.js";
import { ConfigModule } from "./modules/config/config.module.js";
import { GuildModule } from "./modules/guild/guild.module.js";
import { ModerationModule } from "./modules/moderation/moderation.module.js";
import { PingModule } from "./modules/ping/ping.module.js";
import { GuildTicketModule } from "./modules/tickets/guild/guild-ticket.module.js";
import { StaffTicketModule } from "./modules/tickets/staff/staff-ticket.module.js";
import { WelcomeModule } from "./modules/welcome/welcome.module.js";
import { ActivityService } from "./services/activity.service.js";
import { AuditLogService } from "./services/audit-log.service.js";
import { LoggerService } from "./services/logger.service.js";
import { PrismaService } from "./services/prisma.service.js";

@Module({
  imports: [
    PingModule,
    GuildModule,
    ConfigModule,
    ModerationModule,
    AutoModModule,
    WelcomeModule,
    GuildTicketModule,
    StaffTicketModule,
  ],
  events: [ReadyEvent, GuildCreateEvent, GuildDeleteEvent],
  providers: [ActivityService, LoggerService, PrismaService, AuditLogService],
})
export class AppModule {}
