import { EmbedBuilder } from "discord.js";
import type { GuildMember } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../../core/decorators/event.decorator.js";
import type { IEvent } from "../../core/interfaces/event.interface.js";
import { LoggerService } from "../../services/logger.service.js";
import { ConfigService } from "../config/config.service.js";

@Event({ name: "guildMemberAdd" })
export class WelcomeEvent implements IEvent {
  constructor(
    @inject(ConfigService) private readonly config: ConfigService,
    @inject(LoggerService) private readonly logger: LoggerService
  ) {}

  async execute(member: GuildMember): Promise<void> {
    const settings = await this.config.getSettings(member.guild.id);
    if (!settings) return;

    // Assign welcome role
    if (settings.welcomeRoleId) {
      try {
        await member.roles.add(settings.welcomeRoleId);
      } catch (error) {
        this.logger.warn(`Welcome: could not assign role to ${member.id}:`, error);
      }
    }

    // Send welcome message
    if (settings.welcomeChannelId) {
      try {
        const channel = await member.guild.channels.fetch(settings.welcomeChannelId);
        if (!channel?.isTextBased()) return;

        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("👋 Welcome!")
          .setDescription(
            `Welcome to **${member.guild.name}**, ${member}! We're glad to have you here.`
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setFooter({ text: `Member #${member.guild.memberCount}` })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      } catch (error) {
        this.logger.warn(`Welcome: could not send welcome message for ${member.id}:`, error);
      }
    }
  }
}
