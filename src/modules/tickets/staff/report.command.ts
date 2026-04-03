import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../../core/decorators/index.js";
import type { ICommand } from "../../../core/interfaces/command.interface.js";

const REPORT_TYPES = ["bug", "misuse", "feature", "other"] as const;
const MODAL_TITLES: Record<string, string> = {
  bug: "🐛 Report a Bug",
  misuse: "⚠️ Report Misuse",
  feature: "💡 Feature Request",
  other: "❓ Other / General Inquiry",
};

@Command({ name: "report", description: "Submit a report or feedback to the bot's support team" })
export class ReportCommand implements ICommand {
  build(builder: SlashCommandBuilder) {
    return builder.addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("What are you reporting?")
        .setRequired(true)
        .addChoices(
          { name: "🐛 Bug", value: "bug" },
          { name: "⚠️ Misuse", value: "misuse" },
          { name: "💡 Feature Request", value: "feature" },
          { name: "❓ Other", value: "other" }
        )
    );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const type = interaction.options.getString("type", true) as (typeof REPORT_TYPES)[number];

    const modal = new ModalBuilder()
      .setCustomId(`staff:report:${type}`)
      .setTitle(MODAL_TITLES[type])
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Describe the issue in detail")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(1000)
            .setPlaceholder("Please be as specific as possible...")
        )
      );

    await interaction.showModal(modal);
  }
}
