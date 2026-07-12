import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../../core/decorators/index.js";
import { RequirePermissions } from "../../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";
import { errorEmbed, infoEmbed, successEmbed } from "../../../core/utils/embeds.js";
import { env } from "../../../env.js";
import { StaffTicketService } from "./staff-ticket.service.js";

const STATUS_COLORS: Record<string, number> = {
  OPEN: 0x57f287,
  IN_PROGRESS: 0xfee75c,
  RESOLVED: 0x5865f2,
  CLOSED: 0x99aab5,
};

@Command({ name: "staff", description: "Staff ticket management (support server only)" })
@RequirePermissions(PermissionFlagsBits.ManageGuild)
export class StaffCommand implements ICommand {
  constructor(@inject(StaffTicketService) private readonly staffTickets: StaffTicketService) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addSubcommand((sub) =>
        sub
          .setName("view")
          .setDescription("View a staff ticket")
          .addStringOption((opt) =>
            opt.setName("id").setDescription("Ticket ID (e.g. TabC3xK9mR)").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("in-progress")
          .setDescription("Mark a ticket as in progress")
          .addStringOption((opt) =>
            opt.setName("id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("resolve")
          .setDescription("Mark a ticket as resolved")
          .addStringOption((opt) =>
            opt.setName("id").setDescription("Ticket ID").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("close")
          .setDescription("Close a ticket")
          .addStringOption((opt) =>
            opt.setName("id").setDescription("Ticket ID").setRequired(true)
          )
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Gate to support guild only
    if (env.SUPPORT_GUILD_ID && interaction.guildId !== env.SUPPORT_GUILD_ID) {
      await interaction.reply({
        embeds: [errorEmbed("This command can only be used in the support server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sub = interaction.options.getSubcommand();
    const id = interaction.options.getString("id", true).trim();

    const ticket = await this.staffTickets.findById(id);
    if (!ticket) {
      await interaction.editReply({ embeds: [errorEmbed(`No ticket found with ID \`${id}\`.`)] });
      return;
    }

    if (sub === "view") {
      const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS[ticket.status] ?? 0x5865f2)
        .setTitle(`Ticket ${ticket.id}`)
        .addFields(
          { name: "Type", value: ticket.type, inline: true },
          { name: "Status", value: ticket.status, inline: true },
          { name: "From", value: `<@${ticket.userId}>`, inline: true },
          { name: "Description", value: ticket.description },
          ...(ticket.threadId ? [{ name: "Thread", value: `<#${ticket.threadId}>`, inline: true }] : [])
        )
        .setTimestamp(ticket.createdAt);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const statusMap: Record<string, "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"> = {
      "in-progress": "IN_PROGRESS",
      resolve: "RESOLVED",
      close: "CLOSED",
    };

    const newStatus = statusMap[sub];
    if (!newStatus) return;

    await this.staffTickets.updateStatus(id, newStatus);

    // DM the user about the status change
    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      const dmMessages: Record<string, string> = {
        IN_PROGRESS: `Your report **${ticket.id}** is now being reviewed by our team.`,
        RESOLVED: `Your report **${ticket.id}** has been marked as resolved. Thank you for your feedback!`,
        CLOSED: `Your report **${ticket.id}** has been closed.`,
      };
      if (dmMessages[newStatus]) {
        await user.send({ embeds: [infoEmbed(dmMessages[newStatus], "📬 Ticket Update")] });
      }
    } catch { /* DMs disabled */ }

    await interaction.editReply({
      embeds: [successEmbed(`Ticket \`${id}\` marked as **${newStatus}**.`)],
    });
  }
}
