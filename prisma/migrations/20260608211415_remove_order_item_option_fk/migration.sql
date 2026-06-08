-- DropForeignKey
ALTER TABLE "order_item_options" DROP CONSTRAINT "order_item_options_menuOptionValueId_fkey";

-- AlterTable
ALTER TABLE "order_item_options" ALTER COLUMN "menuOptionValueId" DROP NOT NULL;
