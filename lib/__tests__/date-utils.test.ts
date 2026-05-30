import { describe, it, expect } from "vitest";
import { normalizeMonthYear } from "../date-utils";

const FALLBACK = new Date(2026, 4, 1); // May 2026 — getMonth()+1 = 5, getFullYear() = 2026

describe("normalizeMonthYear", () => {
  it("returns valid month and year unchanged", () => {
    expect(normalizeMonthYear("3", "2025", FALLBACK)).toEqual({ month: 3, year: 2025 });
  });

  it("falls back when month is NaN", () => {
    expect(normalizeMonthYear("abc", "2025", FALLBACK)).toEqual({ month: 5, year: 2025 });
  });

  it("falls back when month is below range", () => {
    expect(normalizeMonthYear("0", "2025", FALLBACK)).toEqual({ month: 5, year: 2025 });
  });

  it("falls back when month is above range", () => {
    expect(normalizeMonthYear("13", "2025", FALLBACK)).toEqual({ month: 5, year: 2025 });
  });

  it("falls back when year is NaN", () => {
    expect(normalizeMonthYear("3", "xyz", FALLBACK)).toEqual({ month: 3, year: 2026 });
  });

  it("falls back when year is below range", () => {
    expect(normalizeMonthYear("3", "1999", FALLBACK)).toEqual({ month: 3, year: 2026 });
  });

  it("falls back when year is above range", () => {
    expect(normalizeMonthYear("3", "2101", FALLBACK)).toEqual({ month: 3, year: 2026 });
  });

  it("falls back when month is null", () => {
    expect(normalizeMonthYear(null, "2025", FALLBACK)).toEqual({ month: 5, year: 2025 });
  });

  it("falls back when month is undefined", () => {
    expect(normalizeMonthYear(undefined, "2025", FALLBACK)).toEqual({ month: 5, year: 2025 });
  });

  it("accepts boundary values — month 1 and month 12", () => {
    expect(normalizeMonthYear("1", "2025", FALLBACK)).toEqual({ month: 1, year: 2025 });
    expect(normalizeMonthYear("12", "2025", FALLBACK)).toEqual({ month: 12, year: 2025 });
  });

  it("accepts boundary values — year 2000 and year 2100", () => {
    expect(normalizeMonthYear("3", "2000", FALLBACK)).toEqual({ month: 3, year: 2000 });
    expect(normalizeMonthYear("3", "2100", FALLBACK)).toEqual({ month: 3, year: 2100 });
  });
});
