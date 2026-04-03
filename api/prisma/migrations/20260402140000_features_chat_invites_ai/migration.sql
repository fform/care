-- CreateEnum
CREATE TYPE "app"."InviteKind" AS ENUM ('link', 'direct_email', 'direct_phone');

-- AlterTable
ALTER TABLE "app"."Circle" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#6B8F71';

-- AlterTable
ALTER TABLE "app"."Task" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "app"."Task" ADD COLUMN "recurrenceSlotTimes" JSONB;

-- CreateTable
CREATE TABLE "app"."TaskSlotCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedByUserId" TEXT NOT NULL,

    CONSTRAINT "TaskSlotCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ChatThread" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Schedule" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."CircleInvite" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "secretCode" TEXT NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "kind" "app"."InviteKind" NOT NULL,
    "invitedEmail" TEXT,
    "invitedPhone" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "consumedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."AiSuggestedAction" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AiSuggestedAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskSlotCompletion_taskId_date_slotIndex_key" ON "app"."TaskSlotCompletion"("taskId", "date", "slotIndex");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "app"."ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CircleInvite_secretCode_key" ON "app"."CircleInvite"("secretCode");

-- CreateIndex
CREATE INDEX "CircleInvite_circleId_idx" ON "app"."CircleInvite"("circleId");

-- CreateIndex
CREATE INDEX "AiSuggestedAction_userId_status_idx" ON "app"."AiSuggestedAction"("userId", "status");

-- AddForeignKey
ALTER TABLE "app"."TaskSlotCompletion" ADD CONSTRAINT "TaskSlotCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "app"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."TaskSlotCompletion" ADD CONSTRAINT "TaskSlotCompletion_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "app"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app"."ChatThread" ADD CONSTRAINT "ChatThread_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "app"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "app"."ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app"."Schedule" ADD CONSTRAINT "Schedule_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "app"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."CircleInvite" ADD CONSTRAINT "CircleInvite_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "app"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."AiSuggestedAction" ADD CONSTRAINT "AiSuggestedAction_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "app"."Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."AiSuggestedAction" ADD CONSTRAINT "AiSuggestedAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
