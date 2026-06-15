-- AlterTable
ALTER TABLE "api_metrics" ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "api_metrics_ipAddress_idx" ON "api_metrics"("ipAddress");
