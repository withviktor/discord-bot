import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export interface ICommand {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  /**
   * Optionally extend the slash command builder to add options, subcommands, etc.
   * If not defined, the command is registered with only the name and description
   * from the @Command decorator.
   */
  build?(builder: SlashCommandBuilder): Pick<SlashCommandBuilder, "toJSON">;
}
