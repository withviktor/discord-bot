-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('WARN', 'KICK', 'BAN', 'TIMEOUT', 'UNBAN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "StaffTicketType" AS ENUM ('BUG', 'MISUSE', 'FEATURE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

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
    "ticketCategoryId" TEXT,
    "ticketSupportRoleId" TEXT,
    "ticketLogChannelId" TEXT,
    "ticketNamingScheme" TEXT NOT NULL DEFAULT 'username',
    "ticketPanelTitle" TEXT,
    "ticketPanelDesc" TEXT,
    "ticketButtonLabel" TEXT,
    "ticketButtonStyle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "type" "ModerationActionType" NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildTicket" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "type" "StaffTicketType" NOT NULL,
    "status" "StaffTicketStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildTicket_channelId_key" ON "GuildTicket"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTicket_threadId_key" ON "StaffTicket"("threadId");

-- AddForeignKey
ALTER TABLE "GuildSettings" ADD CONSTRAINT "GuildSettings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildTicket" ADD CONSTRAINT "GuildTicket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
