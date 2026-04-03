import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const BUTTON_STYLES: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
};
import type { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../../core/decorators/index.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";
import { errorEmbed, infoEmbed, successEmbed } from "../../../core/utils/embeds.js";
import { ConfigService } from "../../config/config.service.js";
import { GuildTicketService } from "./guild-ticket.service.js";

@Command({ name: "ticket", description: "Ticket management" })
export class GuildTicketCommand implements ICommand {
  constructor(
    @inject(GuildTicketService) private readonly tickets: GuildTicketService,
    @inject(ConfigService) private readonly config: ConfigService
  ) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addSubcommand((sub) =>
        sub.setName("setup").setDescription("Post the ticket panel in this channel")
      )
      .addSubcommand((sub) =>
        sub
          .setName("close")
          .setDescription("Close this ticket")
          .addStringOption((opt) => opt.setName("reason").setDescription("Reason for closing"))
      )
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription("Add a user to this ticket")
          .addUserOption((opt) =>
            opt.setName("user").setDescription("User to add").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription("Remove a user from this ticket")
          .addUserOption((opt) =>
            opt.setName("user").setDescription("User to remove").setRequired(true)
          )
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    if (sub === "setup") return this.handleSetup(interaction);
    if (sub === "close") return this.handleClose(interaction);
    if (sub === "add") return this.handleAdd(interaction);
    if (sub === "remove") return this.handleRemove(interaction);
  }

  private async handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        embeds: [errorEmbed("Only administrators can set up the ticket panel.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await this.config.getSettings(interaction.guildId!);
    if (!settings?.ticketCategoryId) {
      await interaction.editReply({
        embeds: [errorEmbed("Configure a ticket category first with `/config ticket category`.")],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(settings.ticketPanelTitle ?? "🎫 Support Tickets")
      .setDescription(
        settings.ticketPanelDesc ??
          "Need help? Click the button below to open a private support ticket.\nA staff member will assist you as soon as possible."
      )
      .setFooter({ text: interaction.guild!.name })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("ticket:create")
      .setLabel(settings.ticketButtonLabel ?? "Create Ticket")
      .setStyle(BUTTON_STYLES[settings.ticketButtonStyle ?? ""] ?? ButtonStyle.Primary)
      .setEmoji("🎫");

    await interaction.channel!.send({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
    });

    await interaction.editReply({ embeds: [successEmbed("Ticket panel posted.")] });
  }

  private async handleClose(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild || !interaction.channel) return;

    const ticket = await this.tickets.findByChannel(interaction.channelId);
    if (!ticket || ticket.status === "CLOSED") {
      await interaction.editReply({
        embeds: [errorEmbed("This channel is not an open ticket.")],
      });
      return;
    }

    const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    const isOwner = ticket.userId === interaction.user.id;
    if (!isStaff && !isOwner) {
      await interaction.editReply({
        embeds: [errorEmbed("Only the ticket owner or staff can close this ticket.")],
      });
      return;
    }

    const reason = interaction.options.getString("reason") ?? undefined;
    await this.closeAndCleanup(interaction, ticket, reason);
  }

  async closeAndCleanup(
    interaction: ChatInputCommandInteraction,
    ticket: { id: string; userId: string },
    reason: string | undefined
  ): Promise<void> {
    if (!interaction.guild || !interaction.channel) return;

    const settings = await this.config.getSettings(interaction.guild.id);
    const channel = interaction.channel as TextChannel;

    await this.tickets.closeTicket(channel.id, interaction.user.id, reason, settings?.ticketLogChannelId);

    // Post transcript to log channel
    if (settings?.ticketLogChannelId) {
      try {
        const logChannel = await interaction.guild.channels.fetch(settings.ticketLogChannelId);
        if (logChannel?.isTextBased()) {
          const transcript = await this.tickets.generateTranscript(channel, ticket.id);
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`🎫 Ticket Closed — ${ticket.id}`)
            .addFields(
              { name: "Opened by", value: `<@${ticket.userId}>`, inline: true },
              { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Reason", value: reason ?? "No reason provided" }
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed], files: [transcript] });
        }
      } catch { /* Log channel unavailable */ }
    }

    await interaction.editReply({ embeds: [successEmbed("Ticket closed. Deleting channel in 5 seconds.")] });

    setTimeout(() => channel.delete().catch(() => {}), 5_000);
  }

  private async handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const ticket = await this.tickets.findByChannel(interaction.channelId);
    if (!ticket || ticket.status === "CLOSED") {
      await interaction.editReply({ embeds: [errorEmbed("This channel is not an open ticket.")] });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    await interaction.channel!.permissionOverwrites.create(targetUser.id, {
      ViewChannel: true,
      SendMessages: true,
    });

    await interaction.editReply({
      embeds: [successEmbed(`${targetUser} has been added to this ticket.`, infoEmbed("").data.title)],
    });
    await interaction.channel!.send({ embeds: [infoEmbed(`${targetUser} was added to this ticket.`)] });
  }

  private async handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const ticket = await this.tickets.findByChannel(interaction.channelId);
    if (!ticket || ticket.status === "CLOSED") {
      await interaction.editReply({ embeds: [errorEmbed("This channel is not an open ticket.")] });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    if (targetUser.id === ticket.userId) {
      await interaction.editReply({ embeds: [errorEmbed("You cannot remove the ticket owner.")] });
      return;
    }

    await interaction.channel!.permissionOverwrites.delete(targetUser.id);
    await interaction.editReply({
      embeds: [successEmbed(`${targetUser} has been removed from this ticket.`)],
    });
    await interaction.channel!.send({ embeds: [infoEmbed(`${targetUser} was removed from this ticket.`)] });
  }
}
