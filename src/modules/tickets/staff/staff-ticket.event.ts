import type { StaffTicketType } from "@prisma/client";
import { MessageFlags } from "discord.js";
import type { Interaction, ModalSubmitInteraction } from "discord.js";
import { inject } from "tsyringe";
import { Event } from "../../../core/decorators/event.decorator.js";
import type { IEvent } from "../../../core/interfaces/event.interface.js";
import { infoEmbed } from "../../../core/utils/embeds.js";
import { StaffTicketService } from "./staff-ticket.service.js";

const VALID_TYPES = new Set(["bug", "misuse", "feature", "other"]);

@Event({ name: "interactionCreate" })
export class StaffTicketEvent implements IEvent {
  constructor(@inject(StaffTicketService) private readonly staffTickets: StaffTicketService) {}

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("staff:report:")) return;

    await this.handleReportSubmit(interaction);
  }

  private async handleReportSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const type = interaction.customId.split(":")[2] as string;
    if (!VALID_TYPES.has(type)) return;

    const description = interaction.fields.getTextInputValue("description");

    const ticket = await this.staffTickets.createTicket(
      interaction.client,
      interaction.user.id,
      interaction.guildId,
      type.toUpperCase() as StaffTicketType,
      description
    );

    await interaction.editReply({
      embeds: [
        infoEmbed(
          `Your report has been submitted. Our team will review it shortly.\n\n**Ticket ID:** \`${ticket.id}\`\n\nYou'll receive a DM when the status changes.`,
          "📬 Report Submitted"
        ),
      ],
    });
  }
}
