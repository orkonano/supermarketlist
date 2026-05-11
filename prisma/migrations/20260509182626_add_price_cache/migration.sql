-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "supermarket" TEXT NOT NULL,
    "price" REAL,
    "priceText" TEXT,
    "productName" TEXT,
    "productUrl" TEXT,
    "imageUrl" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PriceCache_query_idx" ON "PriceCache"("query");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_query_supermarket_key" ON "PriceCache"("query", "supermarket");
