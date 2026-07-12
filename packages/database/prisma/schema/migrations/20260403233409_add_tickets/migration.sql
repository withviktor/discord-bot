-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "StaffTicketType" AS ENUM ('BUG', 'MISUSE', 'FEATURE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "GuildSettings" ADD COLUMN     "ticketCategoryId" TEXT,
ADD COLUMN     "ticketLogChannelId" TEXT,
ADD COLUMN     "ticketSupportRoleId" TEXT;

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
ALTER TABLE "GuildTicket" ADD CONSTRAINT "GuildTicket_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
