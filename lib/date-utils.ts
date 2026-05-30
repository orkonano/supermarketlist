export function normalizeMonthYear(
  monthStr: string | null | undefined,
  yearStr: string | null | undefined,
  fallback: Date = new Date()
): { month: number; year: number } {
  const rawMonth = parseInt(monthStr ?? "", 10);
  const rawYear = parseInt(yearStr ?? "", 10);
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : fallback.getMonth() + 1;
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : fallback.getFullYear();
  return { month, year };
}
