import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { inject } from "tsyringe";
import { Command } from "../../core/decorators/index.js";
import { RequirePermissions } from "../../core/decorators/require-permissions.decorator.js";
import type { ICommand } from "../../core/interfaces/command.interface.js";
import { errorEmbed, infoEmbed, successEmbed } from "../../core/utils/embeds.js";
import { ConfigService } from "./config.service.js";

@Command({ name: "config", description: "Configure the bot for this server" })
@RequirePermissions(PermissionFlagsBits.Administrator)
export class ConfigCommand implements ICommand {
  constructor(@inject(ConfigService) private readonly config: ConfigService) {}

  build(builder: SlashCommandBuilder) {
    return builder
      .addSubcommand((sub) =>
        sub
          .setName("auditlog")
          .setDescription("Set the audit log channel")
          .addChannelOption((opt) =>
            opt
              .setName("channel")
              .setDescription("Channel to post mod actions to")
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true)
          )
      )
      .addSubcommandGroup((group) =>
        group
          .setName("welcome")
          .setDescription("Welcome settings")
          .addSubcommand((sub) =>
            sub
              .setName("channel")
              .setDescription("Set the welcome message channel")
              .addChannelOption((opt) =>
                opt
                  .setName("channel")
                  .setDescription("Channel to send welcome messages to")
                  .addChannelTypes(ChannelType.GuildText)
                  .setRequired(true)
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("role")
              .setDescription("Set the role assigned to new members on join")
              .addRoleOption((opt) =>
                opt.setName("role").setDescription("Role to assign").setRequired(true)
              )
          )
      )
      .addSubcommandGroup((group) =>
        group
          .setName("automod")
          .setDescription("Auto-moderation settings")
          .addSubcommand((sub) =>
            sub
              .setName("spam")
              .setDescription("Toggle spam detection")
              .addBooleanOption((opt) =>
                opt.setName("enabled").setDescription("Enable or disable").setRequired(true)
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("invites")
              .setDescription("Toggle invite link filter")
              .addBooleanOption((opt) =>
                opt.setName("enabled").setDescription("Enable or disable").setRequired(true)
              )
          )
      )
      .addSubcommandGroup((group) =>
        group
          .setName("filter")
          .setDescription("Word filter settings")
          .addSubcommand((sub) =>
            sub
              .setName("add")
              .setDescription("Add a word to the filter")
              .addStringOption((opt) =>
                opt.setName("word").setDescription("Word to block").setRequired(true)
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("remove")
              .setDescription("Remove a word from the filter")
              .addStringOption((opt) =>
                opt.setName("word").setDescription("Word to unblock").setRequired(true)
              )
          )
          .addSubcommand((sub) => sub.setName("list").setDescription("List all filtered words"))
          .addSubcommand((sub) =>
            sub
              .setName("enable")
              .setDescription("Enable or disable the word filter")
              .addBooleanOption((opt) =>
                opt.setName("enabled").setDescription("Enable or disable").setRequired(true)
              )
          )
      )
      .addSubcommandGroup((group) =>
        group
          .setName("ticket")
          .setDescription("Guild ticket system settings")
          .addSubcommand((sub) =>
            sub
              .setName("category")
              .setDescription("Category where ticket channels are created")
              .addChannelOption((opt) =>
                opt
                  .setName("category")
                  .setDescription("Channel category")
                  .addChannelTypes(ChannelType.GuildCategory)
                  .setRequired(true)
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("support-role")
              .setDescription("Role that can see and manage all tickets")
              .addRoleOption((opt) =>
                opt.setName("role").setDescription("Support role").setRequired(true)
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("log")
              .setDescription("Channel where ticket transcripts are posted on close")
              .addChannelOption((opt) =>
                opt
                  .setName("channel")
                  .setDescription("Log channel")
                  .addChannelTypes(ChannelType.GuildText)
                  .setRequired(true)
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("name")
              .setDescription("How new ticket channels are named")
              .addStringOption((opt) =>
                opt
                  .setName("scheme")
                  .setDescription("Naming scheme")
                  .setRequired(true)
                  .addChoices(
                    { name: "Username  (ticket-johndoe)", value: "username" },
                    { name: "User ID   (ticket-123456789)", value: "userid" },
                    { name: "Ticket ID (ticket-TabC3xK9mR)", value: "ticketid" }
                  )
              )
          )
          .addSubcommand((sub) =>
            sub
              .setName("panel")
              .setDescription("Customise the ticket panel embed and button")
              .addStringOption((opt) =>
                opt.setName("title").setDescription("Panel embed title")
              )
              .addStringOption((opt) =>
                opt.setName("description").setDescription("Panel embed description")
              )
              .addStringOption((opt) =>
                opt.setName("button-label").setDescription("Text on the create-ticket button")
              )
              .addStringOption((opt) =>
                opt
                  .setName("button-style")
                  .setDescription("Colour of the create-ticket button")
                  .addChoices(
                    { name: "Primary (blue)", value: "primary" },
                    { name: "Secondary (grey)", value: "secondary" },
                    { name: "Success (green)", value: "success" },
                    { name: "Danger (red)", value: "danger" }
                  )
              )
          )
      );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.guild) return;

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // /config auditlog
    if (!group && sub === "auditlog") {
      const channel = interaction.options.getChannel("channel", true);
      await this.config.upsertSettings(guildId, { auditLogChannelId: channel.id });
      await interaction.editReply({
        embeds: [successEmbed(`Audit log channel set to ${channel}.`, "✅ Config Updated")],
      });
      return;
    }

    // /config welcome channel | role
    if (group === "welcome") {
      if (sub === "channel") {
        const channel = interaction.options.getChannel("channel", true);
        await this.config.upsertSettings(guildId, { welcomeChannelId: channel.id });
        await interaction.editReply({
          embeds: [successEmbed(`Welcome channel set to ${channel}.`, "✅ Config Updated")],
        });
      } else if (sub === "role") {
        const role = interaction.options.getRole("role", true);
        await this.config.upsertSettings(guildId, { welcomeRoleId: role.id });
        await interaction.editReply({
          embeds: [successEmbed(`Welcome role set to ${role}.`, "✅ Config Updated")],
        });
      }
      return;
    }

    // /config automod spam | invites
    if (group === "automod") {
      const enabled = interaction.options.getBoolean("enabled", true);
      if (sub === "spam") {
        await this.config.upsertSettings(guildId, { antiSpamEnabled: enabled });
        await interaction.editReply({
          embeds: [
            successEmbed(`Spam detection **${enabled ? "enabled" : "disabled"}**.`, "✅ Config Updated"),
          ],
        });
      } else if (sub === "invites") {
        await this.config.upsertSettings(guildId, { antiInviteEnabled: enabled });
        await interaction.editReply({
          embeds: [
            successEmbed(
              `Invite link filter **${enabled ? "enabled" : "disabled"}**.`,
              "✅ Config Updated"
            ),
          ],
        });
      }
      return;
    }

    // /config filter add | remove | list
    if (group === "filter") {
      if (sub === "add") {
        const word = interaction.options.getString("word", true).toLowerCase();
        await this.config.addWord(guildId, word);
        await interaction.editReply({
          embeds: [successEmbed(`Added \`${word}\` to the word filter.`, "✅ Config Updated")],
        });
      } else if (sub === "remove") {
        const word = interaction.options.getString("word", true).toLowerCase();
        await this.config.removeWord(guildId, word);
        await interaction.editReply({
          embeds: [successEmbed(`Removed \`${word}\` from the word filter.`, "✅ Config Updated")],
        });
      } else if (sub === "list") {
        const settings = await this.config.getSettings(guildId);
        const words = settings?.wordFilterList ?? [];
        if (words.length === 0) {
          await interaction.editReply({
            embeds: [infoEmbed("The word filter list is empty.", "📋 Word Filter")],
          });
        } else {
          await interaction.editReply({
            embeds: [
              infoEmbed(
                words.map((w) => `\`${w}\``).join(", "),
                `📋 Word Filter — ${words.length} word(s)`
              ),
            ],
          });
        }
      } else if (sub === "enable") {
        const enabled = interaction.options.getBoolean("enabled", true);
        await this.config.upsertSettings(guildId, { wordFilterEnabled: enabled });
        await interaction.editReply({
          embeds: [
            successEmbed(
              `Word filter **${enabled ? "enabled" : "disabled"}**.`,
              "✅ Config Updated"
            ),
          ],
        });
      }
      return;
    }

    // /config ticket category | support-role | log
    if (group === "ticket") {
      if (sub === "category") {
        const category = interaction.options.getChannel("category", true);
        await this.config.upsertSettings(guildId, { ticketCategoryId: category.id });
        await interaction.editReply({
          embeds: [successEmbed(`Ticket category set to **${category.name}**.`, "✅ Config Updated")],
        });
      } else if (sub === "support-role") {
        const role = interaction.options.getRole("role", true);
        await this.config.upsertSettings(guildId, { ticketSupportRoleId: role.id });
        await interaction.editReply({
          embeds: [successEmbed(`Ticket support role set to ${role}.`, "✅ Config Updated")],
        });
      } else if (sub === "log") {
        const channel = interaction.options.getChannel("channel", true);
        await this.config.upsertSettings(guildId, { ticketLogChannelId: channel.id });
        await interaction.editReply({
          embeds: [successEmbed(`Ticket log channel set to ${channel}.`, "✅ Config Updated")],
        });
      } else if (sub === "name") {
        const scheme = interaction.options.getString("scheme", true);
        await this.config.upsertSettings(guildId, { ticketNamingScheme: scheme });
        const labels: Record<string, string> = {
          username: "Username (ticket-johndoe)",
          userid: "User ID (ticket-123456789)",
          ticketid: "Ticket ID (ticket-TabC3xK9mR)",
        };
        await interaction.editReply({
          embeds: [successEmbed(`Ticket naming set to **${labels[scheme]}**.`, "✅ Config Updated")],
        });
      } else if (sub === "panel") {
        const updates: Record<string, unknown> = {};
        const title = interaction.options.getString("title");
        const description = interaction.options.getString("description");
        const buttonLabel = interaction.options.getString("button-label");
        const buttonStyle = interaction.options.getString("button-style");
        if (title) updates.ticketPanelTitle = title;
        if (description) updates.ticketPanelDesc = description;
        if (buttonLabel) updates.ticketButtonLabel = buttonLabel;
        if (buttonStyle) updates.ticketButtonStyle = buttonStyle;

        if (Object.keys(updates).length === 0) {
          await interaction.editReply({
            embeds: [errorEmbed("Provide at least one option to update.")],
          });
          return;
        }

        await this.config.upsertSettings(guildId, updates);
        await interaction.editReply({
          embeds: [successEmbed(`Panel settings updated. Re-run \`/ticket setup\` to post the updated panel.`, "✅ Config Updated")],
        });
      }
      return;
    }

    await interaction.editReply({ embeds: [errorEmbed("Unknown subcommand.")] });
  }
}
