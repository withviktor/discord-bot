import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { container } from "tsyringe";
import { env } from "../env.js";
import { COMMAND_METADATA_KEY } from "./decorators/command.decorator.js";
import { EVENT_METADATA_KEY } from "./decorators/event.decorator.js";
import { MODULE_METADATA_KEY } from "./decorators/module.decorator.js";
import type { ModuleOptions } from "./decorators/module.decorator.js";
import type { ICommand } from "./interfaces/command.interface.js";
import type { IEvent } from "./interfaces/event.interface.js";

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

  constructor(private readonly rootModule: Constructor) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
    this.rest = new REST().setToken(env.DISCORD_TOKEN);
  }

  async bootstrap(): Promise<void> {
    const resolved = this.resolveModule(this.rootModule);

    for (const Provider of resolved.providers) {
      container.registerSingleton(Provider);
    }

    const commandMap = new Map<string, ICommand>();
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
      commandMap.set(metadata.name, instance);
    }

    await this.rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
      body: commandData,
    });

    console.log(`Registered ${commandData.length} slash command(s).`);

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

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = commandMap.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command "${interaction.commandName}":`, error);

        const reply = {
          content: "An error occurred while executing this command.",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    });

    await this.client.login(env.DISCORD_TOKEN);
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
