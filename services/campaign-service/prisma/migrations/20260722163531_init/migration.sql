-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('EK_PAKET', 'TARIFE_YUKSELTME', 'CIHAZ_FIRSATI', 'SADAKAT');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('YUKSEK_DEGER', 'RISKLI_KAYIP', 'YENI_ABONE', 'PASIF', 'BELIRSIZ');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('DUSUK', 'ORTA', 'YUKSEK', 'KRITIK');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('YENI', 'ATANDI', 'OPTIMIZE_EDILIYOR', 'TEST_EDILIYOR', 'TAMAMLANDI', 'YAYINDA', 'ARSIVLENDI');

-- CreateEnum
CREATE TYPE "OfferResponse" AS ENUM ('KABUL', 'ILGILENMIYORUM');

-- CreateTable
CREATE TABLE "CampaignSequence" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "campaignNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "targetSegmentHint" "SegmentType",
    "discountRate" DOUBLE PRECISION NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationCase" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "segment" "SegmentType" NOT NULL DEFAULT 'BELIRSIZ',
    "priority" "Priority" NOT NULL DEFAULT 'ORTA',
    "status" "CaseStatus" NOT NULL DEFAULT 'YENI',
    "assignedExpertId" TEXT,
    "assignmentScore" DOUBLE PRECISION,
    "conversionProbability" DOUBLE PRECISION,
    "aiConfidence" DOUBLE PRECISION,
    "wasAiClassified" BOOLEAN NOT NULL DEFAULT true,
    "optimizationNote" TEXT,
    "conversionLift" DOUBLE PRECISION,
    "abTestStartedAt" TIMESTAMP(3),
    "slaStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDueAt" TIMESTAMP(3) NOT NULL,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "CaseStatus" NOT NULL,
    "toStatus" "CaseStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriberOffer" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "conversionProbability" DOUBLE PRECISION NOT NULL,
    "response" "OfferResponse",
    "respondedAt" TIMESTAMP(3),
    "satisfactionStars" INTEGER,
    "satisfactionRatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriberOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_campaignNumber_key" ON "Campaign"("campaignNumber");

-- CreateIndex
CREATE INDEX "Campaign_createdBy_idx" ON "Campaign"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationCase_campaignId_key" ON "OptimizationCase"("campaignId");

-- CreateIndex
CREATE INDEX "OptimizationCase_status_idx" ON "OptimizationCase"("status");

-- CreateIndex
CREATE INDEX "OptimizationCase_assignedExpertId_idx" ON "OptimizationCase"("assignedExpertId");

-- CreateIndex
CREATE INDEX "OptimizationCase_priority_idx" ON "OptimizationCase"("priority");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_idx" ON "CaseStatusHistory"("caseId");

-- CreateIndex
CREATE INDEX "SubscriberOffer_subscriberId_idx" ON "SubscriberOffer"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberOffer_campaignId_subscriberId_key" ON "SubscriberOffer"("campaignId", "subscriberId");

-- AddForeignKey
ALTER TABLE "OptimizationCase" ADD CONSTRAINT "OptimizationCase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OptimizationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriberOffer" ADD CONSTRAINT "SubscriberOffer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
