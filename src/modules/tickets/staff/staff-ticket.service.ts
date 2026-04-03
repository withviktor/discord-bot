import type { StaffTicketType } from "@prisma/client";
import { EmbedBuilder } from "discord.js";
import type { Client } from "discord.js";
import { inject, injectable } from "tsyringe";
import { generateId } from "../../../core/utils/id.js";
import { env } from "../../../env.js";
import { LoggerService } from "../../../services/logger.service.js";
import { PrismaService } from "../../../services/prisma.service.js";

const TYPE_LABELS: Record<StaffTicketType, string> = {
  BUG: "🐛 Bug Report",
  MISUSE: "⚠️ Misuse Report",
  FEATURE: "💡 Feature Request",
  OTHER: "❓ Other",
};

const TYPE_COLORS: Record<StaffTicketType, number> = {
  BUG: 0xed4245,
  MISUSE: 0xfee75c,
  FEATURE: 0x57f287,
  OTHER: 0x5865f2,
};

@injectable()
export class StaffTicketService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async createTicket(
    client: Client,
    userId: string,
    guildId: string | null,
    type: StaffTicketType,
    description: string
  ) {
    const id = generateId("T");

    const ticket = await this.prisma.client.staffTicket.create({
      data: { id, userId, guildId, type, description },
    });

    // Post to support channel and create a thread for staff discussion
    if (env.SUPPORT_GUILD_ID && env.SUPPORT_CHANNEL_ID) {
      try {
        const guild = await client.guilds.fetch(env.SUPPORT_GUILD_ID);
        const channel = await guild.channels.fetch(env.SUPPORT_CHANNEL_ID);

        if (channel?.isTextBased() && "threads" in channel) {
          const user = await client.users.fetch(userId);

          const embed = new EmbedBuilder()
            .setColor(TYPE_COLORS[type])
            .setTitle(`${TYPE_LABELS[type]} · ${id}`)
            .setDescription(description)
            .addFields(
              { name: "From", value: `${user.tag} \`${userId}\``, inline: true },
              ...(guildId ? [{ name: "Guild", value: `\`${guildId}\``, inline: true }] : []),
              { name: "Status", value: "OPEN" }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

          const message = await channel.send({ embeds: [embed] });

          const thread = await message.startThread({
            name: `${TYPE_LABELS[type]} — ${id}`,
            autoArchiveDuration: 10080, // 7 days
          });

          await this.prisma.client.staffTicket.update({
            where: { id },
            data: { threadId: thread.id },
          });
        }
      } catch (error) {
        this.logger.error("Failed to post staff ticket to support channel:", error);
      }
    }

    return ticket;
  }

  async findById(id: string) {
    return this.prisma.client.staffTicket.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") {
    return this.prisma.client.staffTicket.update({ where: { id }, data: { status } });
  }
}
