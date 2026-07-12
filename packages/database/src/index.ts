// Single import point for all database types and the Prisma client.
// Both the bot and the future API import from here — never directly from @prisma/client.
export { PrismaClient } from "@prisma/client";
export type {
  Guild,
  GuildSettings,
  ModerationCase,
  ModerationActionType,
  GuildTicket,
  StaffTicket,
  StaffTicketType,
  StaffTicketStatus,
  TicketStatus,
} from "@prisma/client";
