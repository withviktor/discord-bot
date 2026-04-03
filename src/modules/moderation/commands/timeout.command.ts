import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../../core/decorators/index.js";
import { RequirePermissions } from "../../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";
import { errorEmbed, successEmbed } from "../../../core/utils/embeds.js";
import { AuditLogService } from "../../../services/audit-log.service.js";
import { ModerationService } from "../moderation.service.js";
import { canModerate, parseDuration, replyError } from "../moderation.utils.js";

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1_000; // 28 days

@Command({ name: "timeout", description: "Temporarily mute a member" })
@RequirePermissions(PermissionFlagsBits.ModerateMembers)
export class TimeoutCommand implements ICommand {
  constructor(
    @inject(ModerationService) private readonly moderation: ModerationService,
    @inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to timeout").setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("duration")
          .setDescription("Duration (e.g. 10m, 2h, 1d — max 28d)")
          .setRequired(true)
      )
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the timeout"));
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const durationStr = interaction.options.getString("duration", true);
    const reason = interaction.options.getString("reason") ?? undefined;

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      await replyError(interaction, "Invalid duration. Use a format like `10m`, `2h`, or `7d`.");
      return;
    }

    if (durationMs > MAX_TIMEOUT_MS) {
      await replyError(interaction, "Duration cannot exceed 28 days.");
      return;
    }

    let target: GuildMember;
    try {
      target = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      await replyError(interaction, "That user is not in this server.");
      return;
    }

    const err = canModerate(interaction, target);
    if (err) {
      await replyError(interaction, err);
      return;
    }

    if (!target.moderatable) {
      await replyError(interaction, "I don't have permission to timeout this user.");
      return;
    }

    const expiresAt = new Date(Date.now() + durationMs);

    try {
      await target.user.send({
        embeds: [
          errorEmbed(
            `You were timed out in **${interaction.guild.name}** until <t:${Math.floor(expiresAt.getTime() / 1000)}:F>.${reason ? `\n**Reason:** ${reason}` : ""}`,
            "⏱️ You've Been Timed Out"
          ),
        ],
      });
    } catch { /* DMs disabled */ }

    await target.timeout(durationMs, reason);

    const modCase = await this.moderation.createCase({
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "TIMEOUT",
      reason,
      expiresAt,
    });

    await this.auditLog.log(interaction.guild, modCase);

    await interaction.editReply({
      embeds: [
        successEmbed(
          `**${target.user.tag}** has been timed out until <t:${Math.floor(expiresAt.getTime() / 1000)}:R>. Case **#${modCase.id}**${reason ? `\n**Reason:** ${reason}` : ""}`,
          "⏱️ Member Timed Out"
        ),
      ],
    });
  }
}
