import { Module } from "../../../core/decorators/module.decorator.js";
import { ReportCommand } from "./report.command.js";
import { StaffCommand } from "./staff.command.js";
import { StaffTicketEvent } from "./staff-ticket.event.js";
import { StaffTicketService } from "./staff-ticket.service.js";

@Module({
  commands: [ReportCommand, StaffCommand],
  events: [StaffTicketEvent],
  providers: [StaffTicketService],
})
export class StaffTicketModule {}
