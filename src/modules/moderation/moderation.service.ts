import type { ModerationActionType } from "@prisma/client";
import { generateId } from "../../core/utils/id.js";
import { inject, injectable } from "tsyringe";
import { PrismaService } from "../../services/prisma.service.js";

export interface CreateCaseOptions {
  guildId: string;
  userId: string;
  moderatorId: string;
  type: ModerationActionType;
  reason?: string;
  expiresAt?: Date;
}

@injectable()
export class ModerationService {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  async createCase(options: CreateCaseOptions) {
    return this.prisma.client.moderationCase.create({ data: { id: generateId("C"), ...options } });
  }

  async getCases(guildId: string, userId: string) {
    return this.prisma.client.moderationCase.findMany({
      where: { guildId, userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }
}
