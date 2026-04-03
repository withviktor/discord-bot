import { EmbedBuilder } from "discord.js";

const Colors = {
  error: 0xed4245,
  warning: 0xfee75c,
  success: 0x57f287,
  info: 0x5865f2,
} as const;

export function errorEmbed(description: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.error)
    .setDescription(description)
    .setTimestamp();
  if (title) embed.setTitle(title);
  return embed;
}

export function successEmbed(description: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.success)
    .setDescription(description)
    .setTimestamp();
  if (title) embed.setTitle(title);
  return embed;
}

export function infoEmbed(description: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.info)
    .setDescription(description)
    .setTimestamp();
  if (title) embed.setTitle(title);
  return embed;
}

export function permissionDeniedEmbed(): EmbedBuilder {
  return errorEmbed("You don't have permission to use this command.", "🔒 Missing Permissions");
}

export function commandErrorEmbed(): EmbedBuilder {
  return errorEmbed("An error occurred while executing this command.", "⚠️ Something went wrong");
}
