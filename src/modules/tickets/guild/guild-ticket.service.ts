import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  OverwriteType,
  PermissionFlagsBits,
} from "discord.js";
import type { Guild, GuildMember, TextChannel } from "discord.js";
import { inject, injectable } from "tsyringe";
import { generateId } from "../../../core/utils/id.js";
import { LoggerService } from "../../../services/logger.service.js";
import { PrismaService } from "../../../services/prisma.service.js";

@injectable()
export class GuildTicketService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async findOpenByUser(guildId: string, userId: string) {
    return this.prisma.client.guildTicket.findFirst({
      where: { guildId, userId, status: "OPEN" },
    });
  }

  async findByChannel(channelId: string) {
    return this.prisma.client.guildTicket.findUnique({ where: { channelId } });
  }

  private buildChannelName(scheme: string, member: GuildMember, ticketId: string): string {
    switch (scheme) {
      case "userid":
        return `ticket-${member.id}`;
      case "ticketid":
        return `ticket-${ticketId}`;
      default: {
        // username: sanitise to Discord-safe characters, cap at 20 chars
        const clean = member.user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 20);
        return `ticket-${clean || member.id}`;
      }
    }
  }

  async openTicket(
    guild: Guild,
    member: GuildMember,
    categoryId: string,
    supportRoleId: string | null,
    namingScheme = "username"
  ) {
    const id = generateId("T");

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        type: OverwriteType.Member,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        id: guild.members.me!.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
        ],
      },
    ];

    if (supportRoleId) {
      permissionOverwrites.push({
        id: supportRoleId,
        type: OverwriteType.Role,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    const channel = await guild.channels.create({
      name: this.buildChannelName(namingScheme, member, id),
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites,
    });

    await this.prisma.client.guildTicket.create({
      data: { id, guildId: guild.id, channelId: channel.id, userId: member.id },
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎫 Support Ticket")
      .setDescription(
        `Welcome ${member}, a staff member will be with you shortly.\n\nDescribe your issue and we'll help you as soon as possible.`
      )
      .addFields({ name: "Ticket ID", value: `\`${id}\``, inline: true })
      .setFooter({ text: "Use the button below or /ticket close to close this ticket." })
      .setTimestamp();

    const closeButton = new ButtonBuilder()
      .setCustomId(`ticket:close`)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒");

    await channel.send({
      content: supportRoleId ? `<@&${supportRoleId}>` : undefined,
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton)],
    });

    return { id, channel };
  }

  async closeTicket(
    channelId: string,
    closedById: string,
    reason: string | undefined,
    logChannelId: string | null | undefined
  ) {
    const ticket = await this.findByChannel(channelId);
    if (!ticket || ticket.status === "CLOSED") return null;

    await this.prisma.client.guildTicket.update({
      where: { channelId },
      data: { status: "CLOSED", closedAt: new Date(), closedById, closedReason: reason },
    });

    return ticket;
  }

  async generateTranscript(channel: TextChannel, ticketId: string): Promise<AttachmentBuilder> {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = [...messages.values()].reverse();

    const lines = sorted.map((m) => {
      const ts = m.createdAt.toISOString();
      const content = m.content || (m.embeds.length > 0 ? "[embed]" : "[attachment]");
      return `[${ts}] ${m.author.tag}: ${content}`;
    });

    const text = [`Transcript for ticket ${ticketId}`, `Channel: #${channel.name}`, "", ...lines].join(
      "\n"
    );

    return new AttachmentBuilder(Buffer.from(text, "utf-8"), {
      name: `transcript-${ticketId}.txt`,
    });
  }
}
