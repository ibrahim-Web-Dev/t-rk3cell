-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refCaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'BRONZ',
    "completedCaseCount" INTEGER NOT NULL DEFAULT 0,
    "fastCompletionCount" INTEGER NOT NULL DEFAULT 0,
    "conversionExceedCount" INTEGER NOT NULL DEFAULT 0,
    "riskliKayipRescueCount" INTEGER NOT NULL DEFAULT 0,
    "dailyCompletionDate" TEXT,
    "dailyCompletionCount" INTEGER NOT NULL DEFAULT 0,
    "segmentCounts" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeCode" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAssignmentCache" (
    "caseId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "expertId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseAssignmentCache_pkey" PRIMARY KEY ("caseId")
);

-- CreateIndex
CREATE INDEX "PointsLedger_userId_idx" ON "PointsLedger"("userId");

-- CreateIndex
CREATE INDEX "Badge_userId_idx" ON "Badge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_userId_badgeCode_key" ON "Badge"("userId", "badgeCode");

-- CreateIndex
CREATE INDEX "CaseAssignmentCache_campaignId_idx" ON "CaseAssignmentCache"("campaignId");
