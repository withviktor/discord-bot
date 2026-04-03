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

@Command({ name: "warn", description: "Warn a member and create a mod case" })
@RequirePermissions(PermissionFlagsBits.ModerateMembers)
export class WarnCommand implements ICommand {
  constructor(
    @inject(ModerationService) private readonly moderation: ModerationService,
    @inject(AuditLogService) private readonly auditLog: AuditLogService
  ) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to warn").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for the warning")
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? undefined;

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

    const modCase = await this.moderation.createCase({
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      type: "WARN",
      reason,
    });

    try {
      await target.user.send({
        embeds: [
          errorEmbed(
            `You were warned in **${interaction.guild.name}**.${reason ? `\n**Reason:** ${reason}` : ""}`,
            "⚠️ Warning Received"
          ),
        ],
      });
    } catch { /* DMs disabled */ }

    await this.auditLog.log(interaction.guild, modCase);

    await interaction.editReply({
      embeds: [
        successEmbed(
          `**${target.user.tag}** has been warned. Case **#${modCase.id}**${reason ? `\n**Reason:** ${reason}` : ""}`,
          "⚠️ Member Warned"
        ),
      ],
    });
  }
}
