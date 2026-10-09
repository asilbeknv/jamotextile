-- Collapse the five workshop stages into a single PRODUCTION stage.
-- Orders that were in CUTTING / SEWING / BRANDING / QC / PACKING move to PRODUCTION.

ALTER TYPE "OrderStage" RENAME TO "OrderStage_old";

CREATE TYPE "OrderStage" AS ENUM ('MOCKUP', 'QUOTE', 'PAYMENT', 'PRODUCTION', 'DELIVERY', 'DONE', 'CANCELLED');

ALTER TABLE "Order" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "stage" TYPE "OrderStage" USING (
  CASE
    WHEN "stage"::text IN ('CUTTING', 'SEWING', 'BRANDING', 'QC', 'PACKING') THEN 'PRODUCTION'
    ELSE "stage"::text
  END
)::"OrderStage";
ALTER TABLE "Order" ALTER COLUMN "stage" SET DEFAULT 'MOCKUP';

DROP TYPE "OrderStage_old";
