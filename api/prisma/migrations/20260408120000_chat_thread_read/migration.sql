-- CreateTable
CREATE TABLE "app"."ChatThreadRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThreadRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatThreadRead_userId_threadId_key" ON "app"."ChatThreadRead"("userId", "threadId");

-- CreateIndex
CREATE INDEX "ChatThreadRead_userId_idx" ON "app"."ChatThreadRead"("userId");

-- AddForeignKey
ALTER TABLE "app"."ChatThreadRead" ADD CONSTRAINT "ChatThreadRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ChatThreadRead" ADD CONSTRAINT "ChatThreadRead_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "app"."ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
