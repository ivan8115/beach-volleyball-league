-- AlterEnum
ALTER TYPE "AnnouncementTargetType" ADD VALUE 'ORG';

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_eventId_fkey";

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
