import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import type { Message } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../../core/decorators/event.decorator.js";
import type { IEvent } from "../../core/interfaces/event.interface.js";
import { AuditLogService } from "../../services/audit-log.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { ConfigService } from "../config/config.service.js";
import { ModerationService } from "../moderation/moderation.service.js";
import { AutoModService } from "./automod.service.js";

const AUTOMOD_TIMEOUT_MS = 60_000; // 1 minute timeout for spam

@Event({ name: "messageCreate" })
export class AutoModEvent implements IEvent {
  constructor(
    @inject(AutoModService) private readonly autoMod: AutoModService,
    @inject(ConfigService) private readonly config: ConfigService,
    @inject(ModerationService) private readonly moderation: ModerationService,
    @inject(AuditLogService) private readonly auditLog: AuditLogService,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async execute(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;
    if (!message.member) return;

    // Skip members who can manage messages (mods/admins are exempt)
    if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

    const settings = await this.config.getSettings(message.guild.id);
    if (!settings) return;

    const botId = message.client.user.id;

    // Spam check
    if (settings.antiSpamEnabled) {
      const isSpam = this.autoMod.checkSpam(message.guild.id, message.author.id);
      if (isSpam) {
        await this.handleViolation(message, botId, "SPAM", "Automatic action: spam detection");
        return;
      }
    }

    // Invite link check
    if (settings.antiInviteEnabled && this.autoMod.checkInvite(message.content)) {
      await this.handleViolation(message, botId, "INVITE", "Automatic action: invite link filter");
      return;
    }

    // Word filter check
    if (settings.wordFilterEnabled && settings.wordFilterList.length > 0) {
      const matched = this.autoMod.checkWords(message.content, settings.wordFilterList);
      if (matched) {
        await this.handleViolation(
          message,
          botId,
          "WORD",
          `Automatic action: word filter (\`${matched}\`)`
        );
      }
    }
  }

  private async handleViolation(
    message: Message,
    botId: string,
    type: "SPAM" | "INVITE" | "WORD",
    reason: string
  ): Promise<void> {
    if (!message.guild || !message.member) return;

    try {
      await message.delete();
    } catch { /* Missing permissions or already deleted */ }

    try {
      if (type === "SPAM" && message.member.moderatable) {
        await message.member.timeout(AUTOMOD_TIMEOUT_MS, reason);
      }
    } catch (error) {
      this.logger.warn(`AutoMod: could not timeout ${message.author.id}:`, error);
    }

    const expiresAt = type === "SPAM" ? new Date(Date.now() + AUTOMOD_TIMEOUT_MS) : undefined;

    const modCase = await this.moderation.createCase({
      guildId: message.guild.id,
      userId: message.author.id,
      moderatorId: botId,
      type: type === "SPAM" ? "TIMEOUT" : "WARN",
      reason,
      expiresAt,
    });

    // DM the user so they know what happened
    const dmMessages: Record<typeof type, string> = {
      SPAM:   `You were automatically timed out in **${message.guild.name}** for 1 minute due to sending messages too quickly.`,
      INVITE: `Your message in **${message.guild.name}** was removed because it contained a Discord invite link.`,
      WORD:   `Your message in **${message.guild.name}** was removed because it contained a blocked word.`,
    };

    try {
      await message.author.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("🤖 AutoMod Action")
            .setDescription(dmMessages[type])
            .setFooter({ text: `Case #${modCase.id}` })
            .setTimestamp(),
        ],
      });
    } catch { /* DMs disabled */ }

    await this.auditLog.log(message.guild, modCase);
  }
}
