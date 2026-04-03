import { MessageFlags } from "discord.js";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { errorEmbed } from "../../core/utils/embeds.js";

/** Parse a human duration string like "10m", "2h", "7d" into milliseconds. */
export function parseDuration(input: string): number | null {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim());
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[match[2] as keyof typeof multipliers];
}

/**
 * Returns an error string if the bot cannot moderate the target, or null if it can.
 * Checks role hierarchy, self-moderation, and the server owner.
 */
export function canModerate(
  interaction: ChatInputCommandInteraction,
  target: GuildMember
): string | null {
  if (!interaction.guild) return "This command can only be used in a server.";

  const me = interaction.guild.members.me;
  if (!me) return "Could not resolve bot member.";

  if (target.id === me.id) return "I cannot moderate myself.";
  if (target.id === interaction.user.id) return "You cannot moderate yourself.";
  if (target.id === interaction.guild.ownerId) return "The server owner cannot be moderated.";

  if (target.roles.highest.position >= me.roles.highest.position) {
    return "I cannot moderate this user — their highest role is at or above mine.";
  }

  return null;
}

export async function replyError(
  interaction: ChatInputCommandInteraction,
  message: string
): Promise<void> {
  const payload = { embeds: [errorEmbed(message)], flags: MessageFlags.Ephemeral };
  if (interaction.deferred) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply(payload);
  }
}
