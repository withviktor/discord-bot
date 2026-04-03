import { inject, injectable } from "tsyringe";
import { PrismaService } from "../../services/prisma.service.js";

@injectable()
export class ConfigService {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSettings(guildId: string) {
    return this.prisma.client.guildSettings.findUnique({ where: { guildId } });
  }

  async upsertSettings(guildId: string, data: Record<string, unknown>) {
    return this.prisma.client.guildSettings.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
    });
  }

  async addWord(guildId: string, word: string): Promise<void> {
    await this.prisma.client.guildSettings.upsert({
      where: { guildId },
      create: { guildId, wordFilterList: [word.toLowerCase()] },
      update: { wordFilterList: { push: word.toLowerCase() } },
    });
  }

  async removeWord(guildId: string, word: string): Promise<void> {
    const settings = await this.getSettings(guildId);
    const newList = (settings?.wordFilterList ?? []).filter((w) => w !== word.toLowerCase());
    await this.prisma.client.guildSettings.upsert({
      where: { guildId },
      create: { guildId },
      update: { wordFilterList: newList },
    });
  }
}
