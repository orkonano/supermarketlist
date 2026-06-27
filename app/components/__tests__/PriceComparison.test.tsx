// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SWRConfig } from "swr";
import type { Item } from "@/app/generated/prisma/client";

import PriceComparison from "../PriceComparison";

// Isolate SWR cache per test so stale cache from one test doesn't affect the next.
const isolated = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

// A fresh array of fresh objects every call — mirrors what the Server Component hands
// down on each render (Prisma returns new instances), with the SAME item names.
function makeItems(): Item[] {
  return [{ id: "1", name: "Leche", quantity: null, checked: false }] as unknown as Item[];
}

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ json: async () => ({}) });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("fetches prices once when items is a new array reference but the names are unchanged", async () => {
  const { rerender } = render(<PriceComparison listId="L1" items={makeItems()} />, { wrapper: isolated });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // Simulate the route revalidation a Server Action triggers: the parent re-renders and
  // passes a brand-new `items` array (new object identities) whose names are identical.
  rerender(<PriceComparison listId="L1" items={makeItems()} />);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

  // Regression guard: the URL key stays stable when names don't change, so SWR does not
  // re-fetch. Before the fix the unstable identity caused an infinite loop.
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test("clicking Actualizar triggers exactly one additional fetch", async () => {
  render(<PriceComparison listId="L1" items={makeItems()} />, { wrapper: isolated });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
});
