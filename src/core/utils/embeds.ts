import { EmbedBuilder } from "discord.js";

const Colors = {
  error: 0xed4245,
  warning: 0xfee75c,
} as const;

export function errorEmbed(description: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.error)
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
