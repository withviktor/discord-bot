import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../core/decorators/command.decorator.js";
import type { ICommand } from "../../core/interfaces/command.interface.js";
import { LoggerService } from "../../services/logger.service.js";

@Command({ name: "ping", description: "Replies with Pong and the bot latency" })
export class PingCommand implements ICommand {
  private readonly logger: LoggerService;

  constructor(@inject(LoggerService) logger: LoggerService) {
    this.logger = logger;
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const latency = interaction.client.ws.ping;

    this.logger.debug(`Ping command used by ${interaction.user.tag}`);

    await interaction.reply({
      content: `Pong! Latency: \`${latency}ms\``,
      flags: MessageFlags.Ephemeral
    });
  }
}
