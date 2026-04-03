import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../../core/decorators/index.js";
import { RequirePermissions } from "../../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";
import { errorEmbed, successEmbed } from "../../../core/utils/embeds.js";
import { AuditLogService } from "../../../services/audit-log.service.js";
import { ModerationService } from "../moderation.service.js";
import { canModerate, replyError } from "../moderation.utils.js";

@Command({ name: "ban", description: "Ban a member from the server" })
@RequirePermissions(PermissionFlagsBits.BanMembers)
export class BanCommand implements ICommand {
  constructor(
    @inject(ModerationService) private readonly moderation: ModerationService,
    @inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to ban").setRequired(true)
      )
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban"))
      .addIntegerOption((opt) =>
        opt
          .setName("delete_days")
          .setDescription("Days of message history to delete (0–7)")
          .setMinValue(0)
          .setMaxValue(7)
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

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

    if (!target.bannable) {
      await replyError(interaction, "I don't have permission to ban this user.");
      return;
    }

    try {
      await target.user.send({
        embeds: [
          errorEmbed(
            `You were banned from **${interaction.guild.name}**.${reason ? `\n**Reason:** ${reason}` : ""}`,
            "🔨 You've Been Banned"
          ),
        ],
      });
    } catch { /* DMs disabled */ }

    await target.ban({ reason, deleteMessageSeconds: deleteDays * 86_400 });

    const modCase = await this.moderation.createCase({
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "BAN",
      reason,
    });

    await this.auditLog.log(interaction.guild, modCase);

    await interaction.editReply({
      embeds: [
        successEmbed(
          `**${target.user.tag}** has been banned. Case **#${modCase.id}**${reason ? `\n**Reason:** ${reason}` : ""}`,
          "🔨 Member Banned"
        ),
      ],
    });
  }
}
