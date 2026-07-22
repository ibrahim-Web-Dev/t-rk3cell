-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "modelSource" TEXT NOT NULL DEFAULT 'rule_based';

-- CreateTable
CREATE TABLE "SubscriberTelemetry" (
    "subscriberId" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "crmSegmenti" TEXT,
    "actualChurn" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriberTelemetry_pkey" PRIMARY KEY ("subscriberId")
);
