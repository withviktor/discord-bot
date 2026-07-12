-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('WARN', 'KICK', 'BAN', 'TIMEOUT', 'UNBAN');

-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" TEXT NOT NULL,
    "auditLogChannelId" TEXT,
    "welcomeChannelId" TEXT,
    "welcomeRoleId" TEXT,
    "antiSpamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiInviteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wordFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wordFilterList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "type" "ModerationActionType" NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuildSettings" ADD CONSTRAINT "GuildSettings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
