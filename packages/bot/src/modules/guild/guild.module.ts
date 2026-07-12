import { Module } from "../../core/decorators/module.decorator.js";
import { GuildService } from "./guild.service.js";
import { RegisterGuildCommand } from "./register-guild.command.js";

@Module({
  commands: [RegisterGuildCommand],
  providers: [GuildService],
})
export class GuildModule {}
