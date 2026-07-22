-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('YUKSEK_DEGER', 'RISKLI_KAYIP', 'YENI_ABONE', 'PASIF', 'BELIRSIZ');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('DUSUK', 'ORTA', 'YUKSEK', 'KRITIK');

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "conversionProbability" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentPrediction" (
    "campaignId" TEXT NOT NULL,
    "predictedSegment" "SegmentType" NOT NULL,
    "predictedPriority" "Priority" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isCorrect" BOOLEAN,
    "correctedSegment" "SegmentType",
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SegmentPrediction_pkey" PRIMARY KEY ("campaignId")
);

-- CreateTable
CREATE TABLE "AssignmentLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "expertId" TEXT,
    "score" DOUBLE PRECISION,
    "queued" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpertProfile" (
    "userId" TEXT NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeCaseCount" INTEGER NOT NULL DEFAULT 0,
    "completedCaseCount" INTEGER NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "OfferFeedback" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_campaignId_subscriberId_key" ON "Recommendation"("campaignId", "subscriberId");

-- CreateIndex
CREATE INDEX "SegmentPrediction_predictedSegment_idx" ON "SegmentPrediction"("predictedSegment");

-- CreateIndex
CREATE INDEX "AssignmentLog_caseId_idx" ON "AssignmentLog"("caseId");

-- CreateIndex
CREATE INDEX "OfferFeedback_subscriberId_campaignType_idx" ON "OfferFeedback"("subscriberId", "campaignType");
