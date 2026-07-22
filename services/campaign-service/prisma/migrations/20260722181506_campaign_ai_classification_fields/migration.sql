-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiConversionProbability" DOUBLE PRECISION,
ADD COLUMN     "aiPriority" "Priority",
ADD COLUMN     "aiSegment" "SegmentType",
ADD COLUMN     "wasAiClassified" BOOLEAN NOT NULL DEFAULT false;
