// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Item } from "@/app/generated/prisma/client";

// Mock the Server Action so we can count exactly how many times the component calls it.
const { getItemPrices } = vi.hoisted(() => ({ getItemPrices: vi.fn() }));
vi.mock("@/lib/price-actions", () => ({ getItemPrices }));

import PriceComparison from "../PriceComparison";

// A fresh array of fresh objects every call — mirrors what the Server Component hands
// down on each render (Prisma returns new instances), with the SAME item names.
function makeItems(): Item[] {
  return [{ id: "1", name: "Leche", quantity: null, checked: false }] as unknown as Item[];
}

beforeEach(() => {
  getItemPrices.mockReset();
  getItemPrices.mockResolvedValue({});
});

afterEach(() => cleanup());

test("fetches prices once when items is a new array reference but the names are unchanged", async () => {
  const { rerender } = render(<PriceComparison listId="L1" items={makeItems()} />);
  await waitFor(() => expect(getItemPrices).toHaveBeenCalledTimes(1));

  // Simulate the route revalidation a Server Action triggers: the parent re-renders and
  // passes a brand-new `items` array (new object identities) whose names are identical.
  rerender(<PriceComparison listId="L1" items={makeItems()} />);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

  // Regression guard: before the fix the unstable `itemNames` identity re-fired the effect,
  // turning this into an infinite fetch -> revalidate -> refetch loop (>= 2 here).
  expect(getItemPrices).toHaveBeenCalledTimes(1);
});

test("clicking Actualizar triggers exactly one additional fetch", async () => {
  render(<PriceComparison listId="L1" items={makeItems()} />);
  await waitFor(() => expect(getItemPrices).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await waitFor(() => expect(getItemPrices).toHaveBeenCalledTimes(2));
});
