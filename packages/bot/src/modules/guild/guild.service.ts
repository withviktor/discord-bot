import type { Guild as DiscordGuild } from "discord.js";
import { inject, injectable } from "tsyringe";
import { LoggerService } from "../../services/logger.service.js";
import { PrismaService } from "../../services/prisma.service.js";

@injectable()
export class GuildService {
  private readonly prisma: PrismaService;
  private readonly logger: LoggerService;

  constructor(
    @inject(PrismaService) prisma: PrismaService,
    @inject(LoggerService) logger: LoggerService
  ) {
    this.prisma = prisma;
    this.logger = logger;
  }

  async upsert(guild: DiscordGuild): Promise<void> {
    await this.prisma.client.guild.upsert({
      where: { id: guild.id },
      create: { id: guild.id, name: guild.name, active: true },
      update: { name: guild.name, active: true },
    });
    this.logger.info(`Guild upserted: ${guild.name} (${guild.id})`);
  }

  async deactivate(guildId: string): Promise<void> {
    await this.prisma.client.guild.update({
      where: { id: guildId },
      data: { active: false },
    });
    this.logger.info(`Guild deactivated: ${guildId}`);
  }

  async findActive() {
    return this.prisma.client.guild.findMany({ where: { active: true } });
  }

  async findById(id: string) {
    return this.prisma.client.guild.findUnique({ where: { id } });
  }
}
