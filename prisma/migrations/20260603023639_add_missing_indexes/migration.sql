-- DropIndex
DROP INDEX "PriceCache_query_idx";

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "Item_listId_month_year_idx" ON "Item"("listId", "month", "year");

-- CreateIndex
CREATE INDEX "List_ownerId_idx" ON "List"("ownerId");

-- CreateIndex
CREATE INDEX "ListInvite_email_idx" ON "ListInvite"("email");
