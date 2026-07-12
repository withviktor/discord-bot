import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../../core/decorators/index.js";
import { RequirePermissions } from "../../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";
import { infoEmbed } from "../../../core/utils/embeds.js";
import { ModerationService } from "../moderation.service.js";

const ACTION_ICONS: Record<string, string> = {
  WARN: "⚠️",
  KICK: "👢",
  BAN: "🔨",
  TIMEOUT: "⏱️",
  UNBAN: "✅",
};

@Command({ name: "modlogs", description: "View moderation history for a user" })
@RequirePermissions(PermissionFlagsBits.ModerateMembers)
export class ModlogsCommand implements ICommand {
  constructor(@inject(ModerationService) private readonly moderation: ModerationService) {}

  build(builder: SlashCommandBuilder) {
    return builder.addUserOption((opt) =>
      opt.setName("user").setDescription("User to look up").setRequired(true)
    );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const cases = await this.moderation.getCases(interaction.guild.id, targetUser.id);

    if (cases.length === 0) {
      await interaction.editReply({
        embeds: [infoEmbed(`No moderation cases found for **${targetUser.tag}**.`, "📋 Mod Logs")],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📋 Mod Logs — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: `Showing last ${cases.length} case(s) · User ID: ${targetUser.id}` })
      .setTimestamp();

    for (const c of cases) {
      const icon = ACTION_ICONS[c.type] ?? "•";
      const ts = Math.floor(c.createdAt.getTime() / 1000);
      embed.addFields({
        name: `${icon} Case #${c.id} · ${c.type}`,
        value: `**Reason:** ${c.reason ?? "No reason provided"}\n**Mod:** <@${c.moderatorId}> · <t:${ts}:d>`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
}
