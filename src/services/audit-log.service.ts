import type { ModerationActionType, ModerationCase } from "@prisma/client";
import { EmbedBuilder } from "discord.js";
import type { Guild as DiscordGuild } from "discord.js";
import { inject, injectable } from "tsyringe";
import { ConfigService } from "../modules/config/config.service.js";
import { LoggerService } from "./logger.service.js";

const ACTION_COLORS: Record<ModerationActionType, number> = {
  WARN: 0xfee75c,
  KICK: 0xe67e22,
  BAN: 0xed4245,
  TIMEOUT: 0xe67e22,
  UNBAN: 0x57f287,
};

const ACTION_LABELS: Record<ModerationActionType, string> = {
  WARN: "⚠️ Warn",
  KICK: "👢 Kick",
  BAN: "🔨 Ban",
  TIMEOUT: "⏱️ Timeout",
  UNBAN: "✅ Unban",
};

@injectable()
export class AuditLogService {
  constructor(
    @inject(ConfigService) private readonly config: ConfigService,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async log(guild: DiscordGuild, caseData: ModerationCase): Promise<void> {
    const settings = await this.config.getSettings(guild.id);
    if (!settings?.auditLogChannelId) return;

    try {
      const channel = await guild.channels.fetch(settings.auditLogChannelId);
      if (!channel?.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setColor(ACTION_COLORS[caseData.type])
        .setTitle(`${ACTION_LABELS[caseData.type]} · Case #${caseData.id}`)
        .addFields(
          { name: "User", value: `<@${caseData.userId}> \`${caseData.userId}\``, inline: true },
          {
            name: "Moderator",
            value: `<@${caseData.moderatorId}> \`${caseData.moderatorId}\``,
            inline: true,
          },
          { name: "Reason", value: caseData.reason ?? "No reason provided" }
        )
        .setTimestamp(caseData.createdAt);

      if (caseData.expiresAt) {
        embed.addFields({
          name: "Expires",
          value: `<t:${Math.floor(caseData.expiresAt.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error("Failed to post to audit log:", error);
    }
  }
}
