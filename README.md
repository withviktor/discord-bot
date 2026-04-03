# Discord Bot

A Discord bot framework built with TypeScript, Discord.js, and a NestJS-inspired architecture featuring service injection, decorators, and a module system.

## Stack

- **Runtime**: Node.js 22 + TypeScript
- **Framework**: Discord.js 14
- **DI Container**: tsyringe
- **Database**: PostgreSQL via Prisma 7 (driver adapter)
- **Formatting**: Biome
- **Build**: tsup (ESM output)

---

## Prerequisites

- Node.js 22+
- pnpm
- Docker (for local database)

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required values in `.env`:

| Variable           | Required | Description                                            |
|--------------------|----------|--------------------------------------------------------|
| `DISCORD_TOKEN`    | Yes      | Bot token from the Discord Developer Portal            |
| `DISCORD_CLIENT_ID`| Yes      | Application ID from the Discord Developer Portal       |
| `NODE_ENV`         | Yes      | `development` or `production`                          |
| `DATABASE_URL`     | Yes      | PostgreSQL connection string                           |
| `TOTAL_SHARDS`     | No       | Shard count (`auto` or a positive integer). See below. |

### 3. Start the local database

```bash
pnpm db:start
```

This starts a PostgreSQL container via Docker Compose using the credentials in your `.env`.

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Generate Prisma client

```bash
pnpm db:generate
```

---

## Running the bot

### Development (no sharding)

Hot-reloads on file changes via tsx.

```bash
pnpm dev
```

### Production (no sharding)

```bash
pnpm build
pnpm start
```

---

## Sharding

Sharding is **optional** and disabled by default. You only need it when your bot reaches ~2,500 guilds (Discord's recommended threshold). When sharding is enabled, the `ShardingManager` spawns one worker process per shard, each running a full `BotClient` instance.

### Running with sharding

**Development**

```bash
pnpm dev:sharded
```

Each shard is spawned as a separate tsx process. Prefer `pnpm dev` for day-to-day development — it is simpler to debug and produces the same behaviour on small guild counts.

**Production**

```bash
pnpm build
pnpm start:sharded
```

### Controlling shard count

By default the `ShardingManager` asks Discord how many shards to spawn (`"auto"`). To override this, set `TOTAL_SHARDS` in your `.env`:

```env
# Let Discord decide (default)
# TOTAL_SHARDS=auto

# Pin to 4 shards
TOTAL_SHARDS=4
```

### Notes on sharding

- Each shard is an independent process with its own DI container and database connection.
- `ActivityService.refresh()` only counts guilds on the **current shard**. If you need a global count, use `ShardClientUtil` to broadcast across shards and aggregate the results.
- `ShardingManager` events (`shardCreate`, `ready`, `disconnect`, `death`) are logged via `LoggerService` in `src/shard.ts`.

---

## Project structure

```
src/
├── core/
│   ├── bot.ts                   # BotClient — bootstrap, command routing, lifecycle
│   ├── decorators/              # @Command, @Event, @Module, @RequirePermissions
│   ├── interfaces/              # ICommand, IEvent, OnBotInit, OnBotDestroy
│   └── utils/embeds.ts          # Discord embed helpers
├── modules/
│   ├── guild/                   # GuildService, RegisterGuildCommand, GuildModule
│   └── ping/                    # PingCommand, PingModule
├── events/
│   ├── ready.event.ts
│   ├── guild-create.event.ts
│   └── guild-delete.event.ts
├── services/
│   ├── logger.service.ts        # Coloured console logging
│   ├── prisma.service.ts        # Database client with lifecycle hooks
│   └── activity.service.ts     # Bot presence / user count
├── app.module.ts                # Root module
├── main.ts                      # Single-process entry point
├── shard.ts                     # ShardingManager entry point
└── env.ts                       # Environment variable validation (t3-oss + zod)
```

---

## Adding a command

```ts
// src/modules/example/example.command.ts
import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../core/decorators/index.js";
import type { ICommand } from "../../core/interfaces/command.interface.js";

@Command({ name: "example", description: "An example command" })
export class ExampleCommand implements ICommand {
  build(builder: SlashCommandBuilder) {
    return builder.addStringOption((opt) =>
      opt.setName("input").setDescription("Some input").setRequired(true)
    );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const input = interaction.options.getString("input", true);
    await interaction.reply({ content: `You said: ${input}`, ephemeral: true });
  }
}
```

Register it in a module and include the module in `AppModule`.

## Adding a service

```ts
// src/services/example.service.ts
import { injectable } from "tsyringe";
import type { OnBotInit } from "../core/interfaces/lifecycle.interface.js";

@injectable()
export class ExampleService implements OnBotInit {
  async onInit(): Promise<void> {
    // Runs once during bot bootstrap
  }
}
```

Add it to the `providers` array in your module and inject it via `@inject(ExampleService)`.

---

## Database scripts

| Script                  | Description                          |
|-------------------------|--------------------------------------|
| `pnpm db:start`         | Start local PostgreSQL via Docker    |
| `pnpm db:stop`          | Stop the Docker container            |
| `pnpm db:generate`      | Generate Prisma client               |
| `pnpm db:migrate`       | Run migrations (dev)                 |
| `pnpm db:migrate:deploy`| Run migrations (production)          |
| `pnpm db:studio`        | Open Prisma Studio                   |
