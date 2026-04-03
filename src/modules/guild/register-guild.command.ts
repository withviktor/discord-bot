import { type ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../core/decorators/command.decorator.js";
import { RequirePermissions } from "../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../core/interfaces/command.interface.js";
import { GuildService } from "./guild.service.js";

@RequirePermissions(PermissionFlagsBits.Administrator)
@Command({
  name: "register-guild",
  description:
    "Registers this server in the database. Run this if the bot was added before tracking was set up.",
})
export class RegisterGuildCommand implements ICommand {
  private readonly guildService: GuildService;

  constructor(@inject(GuildService) guildService: GuildService) {
    this.guildService = guildService;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await this.guildService.upsert(interaction.guild);

    await interaction.reply({
      content: "Server registered successfully.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
