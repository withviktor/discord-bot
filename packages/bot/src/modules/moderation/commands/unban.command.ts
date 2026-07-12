import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../../core/decorators/index.js";
import { RequirePermissions } from "../../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";
import { successEmbed } from "../../../core/utils/embeds.js";
import { AuditLogService } from "../../../services/audit-log.service.js";
import { ModerationService } from "../moderation.service.js";
import { replyError } from "../moderation.utils.js";

@Command({ name: "unban", description: "Unban a user from the server" })
@RequirePermissions(PermissionFlagsBits.BanMembers)
export class UnbanCommand implements ICommand {
  constructor(
    @inject(ModerationService) private readonly moderation: ModerationService,
    @inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addStringOption((opt) =>
        opt.setName("user_id").setDescription("ID of the user to unban").setRequired(true)
      )
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the unban"));
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const userId = interaction.options.getString("user_id", true).trim();
    const reason = interaction.options.getString("reason") ?? undefined;

    try {
      await interaction.guild.members.unban(userId, reason);
    } catch {
      await replyError(interaction, "Could not unban that user. They may not be banned or the ID is invalid.");
      return;
    }

    const modCase = await this.moderation.createCase({
      guildId: interaction.guild.id,
      userId,
      moderatorId: interaction.user.id,
      type: "UNBAN",
      reason,
    });

    await this.auditLog.log(interaction.guild, modCase);

    await interaction.editReply({
      embeds: [
        successEmbed(
          `<@${userId}> has been unbanned. Case **#${modCase.id}**${reason ? `\n**Reason:** ${reason}` : ""}`,
          "✅ Member Unbanned"
        ),
      ],
    });
  }
}
