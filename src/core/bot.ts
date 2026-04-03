import {
  Client,
  GatewayIntentBits,
  type PermissionResolvable,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { container } from "tsyringe";
import { env } from "../env.js";
import { LoggerService } from "../services/logger.service.js";
import { COMMAND_METADATA_KEY } from "./decorators/command.decorator.js";
import { EVENT_METADATA_KEY } from "./decorators/event.decorator.js";
import type { ModuleOptions } from "./decorators/module.decorator.js";
import { MODULE_METADATA_KEY } from "./decorators/module.decorator.js";
import { PERMISSIONS_METADATA_KEY } from "./decorators/require-permissions.decorator.js";
import type { ICommand } from "./interfaces/command.interface.js";
import type { IEvent } from "./interfaces/event.interface.js";
import type { OnBotDestroy, OnBotInit } from "./interfaces/lifecycle.interface.js";
import { commandErrorEmbed, permissionDeniedEmbed } from "./utils/embeds.js";

// biome-ignore lint/suspicious/noExplicitAny: constructor type requires any
type Constructor = new (...args: any[]) => unknown;

interface ResolvedModule {
  commands: Constructor[];
  events: Constructor[];
  providers: Constructor[];
}

export class BotClient {
  private readonly client: Client;
  private readonly rest: REST;
  private readonly logger = new LoggerService();

  constructor(private readonly rootModule: Constructor) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
    this.rest = new REST().setToken(env.DISCORD_TOKEN);
  }

  async bootstrap(): Promise<void> {
    const resolved = this.resolveModule(this.rootModule);

    // Register and initialise providers
    for (const Provider of resolved.providers) {
      container.registerSingleton(Provider);
    }

    await this.runLifecycle("onInit", resolved.providers);
    this.registerShutdownHooks(resolved.providers);

    // Build and deploy slash commands
    const commandMap = new Map<string, { instance: ICommand; klass: Constructor }>();
    const commandData: object[] = [];

    for (const CommandClass of resolved.commands) {
      container.registerSingleton(CommandClass);
      const metadata = Reflect.getMetadata(COMMAND_METADATA_KEY, CommandClass) as {
        name: string;
        description: string;
      };

      const instance = container.resolve(CommandClass) as ICommand;
      const builder = new SlashCommandBuilder()
        .setName(metadata.name)
        .setDescription(metadata.description);

      const finalBuilder = instance.build ? instance.build(builder) : builder;
      commandData.push(finalBuilder.toJSON());
      commandMap.set(metadata.name, { instance, klass: CommandClass });
    }

    await this.rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
      body: commandData,
    });

    this.logger.info(`Registered ${commandData.length} slash command(s).`);

    // Register event handlers
    for (const EventClass of resolved.events) {
      container.registerSingleton(EventClass);
      const metadata = Reflect.getMetadata(EVENT_METADATA_KEY, EventClass) as {
        name: string;
        once?: boolean;
      };

      const instance = container.resolve(EventClass) as IEvent;
      const handler = (...args: unknown[]) => instance.execute(...args);

      if (metadata.once) {
        this.client.once(metadata.name, handler);
      } else {
        this.client.on(metadata.name, handler);
      }
    }

    // Route slash command interactions
    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = commandMap.get(interaction.commandName);
      if (!command) return;

      const requiredPerms = Reflect.getMetadata(PERMISSIONS_METADATA_KEY, command.klass) as
        | PermissionResolvable[]
        | undefined;

      if (requiredPerms?.length && !interaction.memberPermissions?.has(requiredPerms)) {
        await interaction.reply({
          embeds: [permissionDeniedEmbed()],
          ephemeral: true,
        });
        return;
      }

      try {
        await command.instance.execute(interaction);
      } catch (error) {
        this.logger.error(`Error executing command "${interaction.commandName}":`, error);

        const reply = { embeds: [commandErrorEmbed()], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    });

    await this.client.login(env.DISCORD_TOKEN);
  }

  private async runLifecycle(
    hook: "onInit" | "onDestroy",
    providers: Constructor[]
  ): Promise<void> {
    for (const Provider of providers) {
      const instance = container.resolve(Provider) as Partial<OnBotInit & OnBotDestroy>;
      if (typeof instance[hook] === "function") {
        await instance[hook]();
      }
    }
  }

  private registerShutdownHooks(providers: Constructor[]): void {
    const shutdown = async () => {
      await this.runLifecycle("onDestroy", providers);
      this.client.destroy();
      process.exit(0);
    };

    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }

  private resolveModule(
    ModuleClass: Constructor,
    visited = new Set<Constructor>()
  ): ResolvedModule {
    if (visited.has(ModuleClass)) {
      return { commands: [], events: [], providers: [] };
    }
    visited.add(ModuleClass);

    const options = (Reflect.getMetadata(MODULE_METADATA_KEY, ModuleClass) ?? {}) as ModuleOptions;
    const result: ResolvedModule = {
      commands: [...(options.commands ?? [])],
      events: [...(options.events ?? [])],
      providers: [...(options.providers ?? [])],
    };

    for (const ImportedModule of options.imports ?? []) {
      const nested = this.resolveModule(ImportedModule, visited);
      result.commands.push(...nested.commands);
      result.events.push(...nested.events);
      result.providers.push(...nested.providers);
    }

    return result;
  }
}
