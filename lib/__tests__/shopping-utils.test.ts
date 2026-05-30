import { describe, it, expect } from "vitest";
import { groupItemsByCategory } from "../shopping-utils";
import type { Item } from "@/app/generated/prisma/client";

const CATEGORIES = ["Lácteos", "Frutas y Verduras", "Otros"];

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "Leche",
    quantity: null,
    category: null,
    checked: false,
    listId: "list-1",
    month: 5,
    year: 2026,
    addedBy: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("groupItemsByCategory", () => {
  it("groups items into their matching category", () => {
    const items = [item({ id: "1", name: "Leche", category: "Lácteos" })];
    const result = groupItemsByCategory(items, CATEGORIES);
    expect(result["Lácteos"]).toHaveLength(1);
    expect(result["Lácteos"][0].name).toBe("Leche");
  });

  it("groups items with null category into Otros", () => {
    const items = [item({ id: "1", category: null })];
    const result = groupItemsByCategory(items, CATEGORIES);
    expect(result["Otros"]).toHaveLength(1);
  });

  it("groups items with unknown category into Otros", () => {
    const items = [item({ id: "1", category: "Electrónica" })];
    const result = groupItemsByCategory(items, CATEGORIES);
    expect(result["Otros"]).toHaveLength(1);
  });

  it("omits categories with no items", () => {
    const items = [item({ id: "1", category: "Lácteos" })];
    const result = groupItemsByCategory(items, CATEGORIES);
    expect(result["Frutas y Verduras"]).toBeUndefined();
  });

  it("returns empty object when items list is empty", () => {
    const result = groupItemsByCategory([], CATEGORIES);
    expect(result).toEqual({});
  });

  it("handles multiple items across multiple categories", () => {
    const items = [
      item({ id: "1", name: "Leche", category: "Lácteos" }),
      item({ id: "2", name: "Yogur", category: "Lácteos" }),
      item({ id: "3", name: "Manzana", category: "Frutas y Verduras" }),
    ];
    const result = groupItemsByCategory(items, CATEGORIES);
    expect(result["Lácteos"]).toHaveLength(2);
    expect(result["Frutas y Verduras"]).toHaveLength(1);
    expect(result["Otros"]).toBeUndefined();
  });
});
