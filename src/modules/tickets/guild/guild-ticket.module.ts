import { Module } from "../../../core/decorators/module.decorator.js";
import { GuildTicketCommand } from "./guild-ticket.command.js";
import { GuildTicketEvent } from "./guild-ticket.event.js";
import { GuildTicketService } from "./guild-ticket.service.js";

@Module({
  commands: [GuildTicketCommand],
  events: [GuildTicketEvent],
  providers: [GuildTicketService],
})
export class GuildTicketModule {}
