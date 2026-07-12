import { Module } from "../../core/decorators/module.decorator.js";
import { BanCommand } from "./commands/ban.command.js";
import { KickCommand } from "./commands/kick.command.js";
import { ModlogsCommand } from "./commands/modlogs.command.js";
import { TimeoutCommand } from "./commands/timeout.command.js";
import { UnbanCommand } from "./commands/unban.command.js";
import { WarnCommand } from "./commands/warn.command.js";
import { ModerationService } from "./moderation.service.js";

@Module({
  commands: [WarnCommand, KickCommand, BanCommand, TimeoutCommand, UnbanCommand, ModlogsCommand],
  providers: [ModerationService],
})
export class ModerationModule {}
