-- AlterTable
ALTER TABLE "GuildSettings" ADD COLUMN     "ticketButtonLabel" TEXT,
ADD COLUMN     "ticketButtonStyle" TEXT,
ADD COLUMN     "ticketNamingScheme" TEXT NOT NULL DEFAULT 'username',
ADD COLUMN     "ticketPanelDesc" TEXT,
ADD COLUMN     "ticketPanelTitle" TEXT;
