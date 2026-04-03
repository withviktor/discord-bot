import { MessageFlags } from "discord.js";
import type { ButtonInteraction, Interaction, TextChannel } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../../../core/decorators/event.decorator.js";
import type { IEvent } from "../../../core/interfaces/event.interface.js";
import { errorEmbed } from "../../../core/utils/embeds.js";
import { ConfigService } from "../../config/config.service.js";
import { GuildTicketService } from "./guild-ticket.service.js";

@Event({ name: "interactionCreate" })
export class GuildTicketEvent implements IEvent {
  constructor(
    @inject(GuildTicketService) private readonly tickets: GuildTicketService,
    @inject(ConfigService) private readonly config: ConfigService
  ) {}

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;

    if (interaction.customId === "ticket:create") {
      await this.handleCreate(interaction);
      return;
    }

    if (interaction.customId === "ticket:close") {
      await this.handleClose(interaction);
    }
  }

  private async handleCreate(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const settings = await this.config.getSettings(interaction.guild.id);
    if (!settings?.ticketCategoryId) {
      await interaction.editReply({
        embeds: [errorEmbed("Tickets are not configured for this server yet.")],
      });
      return;
    }

    const existing = await this.tickets.findOpenByUser(interaction.guild.id, interaction.user.id);
    if (existing) {
      await interaction.editReply({
        embeds: [errorEmbed(`You already have an open ticket: <#${existing.channelId}>`)],
      });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const { id, channel } = await this.tickets.openTicket(
      interaction.guild,
      member,
      settings.ticketCategoryId,
      settings.ticketSupportRoleId ?? null,
      settings.ticketNamingScheme ?? "username"
    );

    await interaction.editReply({
      embeds: [
        {
          color: 0x57f287,
          description: `Your ticket has been created: ${channel} (\`${id}\`)`,
        },
      ],
    });
  }

  private async handleClose(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild || !interaction.channel) return;

    const ticket = await this.tickets.findByChannel(interaction.channelId);
    if (!ticket || ticket.status === "CLOSED") {
      await interaction.editReply({ embeds: [errorEmbed("This ticket is already closed.")] });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isStaff = member.permissions.has(0x20n); // ManageGuild
    const isOwner = ticket.userId === interaction.user.id;
    if (!isStaff && !isOwner) {
      await interaction.editReply({
        embeds: [errorEmbed("Only the ticket owner or staff can close this ticket.")],
      });
      return;
    }

    const settings = await this.config.getSettings(interaction.guild.id);
    const channel = interaction.channel as TextChannel;

    await this.tickets.closeTicket(channel.id, interaction.user.id, undefined, settings?.ticketLogChannelId);

    if (settings?.ticketLogChannelId) {
      try {
        const logChannel = await interaction.guild.channels.fetch(settings.ticketLogChannelId);
        if (logChannel?.isTextBased()) {
          const transcript = await this.tickets.generateTranscript(channel, ticket.id);
          await logChannel.send({
            embeds: [
              {
                color: 0x5865f2,
                title: `🎫 Ticket Closed — ${ticket.id}`,
                fields: [
                  { name: "Opened by", value: `<@${ticket.userId}>`, inline: true },
                  { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
            files: [transcript],
          });
        }
      } catch { /* Log channel unavailable */ }
    }

    await interaction.editReply({ embeds: [{ color: 0x57f287, description: "Ticket closed. Deleting channel in 5 seconds." }] });
    setTimeout(() => channel.delete().catch(() => {}), 5_000);
  }
}
