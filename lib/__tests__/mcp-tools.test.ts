import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../list-service", () => ({
  serviceGetUserLists: vi.fn(),
  serviceCreateList: vi.fn(),
  serviceGetList: vi.fn(),
  serviceGetListItems: vi.fn(),
  serviceUpdateList: vi.fn(),
  serviceDeleteList: vi.fn(),
  serviceAddListItem: vi.fn(),
  serviceToggleListItem: vi.fn(),
  serviceDeleteListItem: vi.fn(),
}));
vi.mock("../price-service", () => ({
  serviceGetItemPrices: vi.fn(),
}));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  serviceGetUserLists,
  serviceCreateList,
  serviceGetList,
  serviceGetListItems,
  serviceUpdateList,
  serviceDeleteList,
  serviceAddListItem,
  serviceToggleListItem,
  serviceDeleteListItem,
} from "../list-service";
import { serviceGetItemPrices } from "../price-service";
import { registerListTools } from "../mcp-tools/lists";
import { registerItemTools } from "../mcp-tools/items";
import { registerPriceTools } from "../mcp-tools/prices";

const fakeUser = {
  id: "user-1", name: "Alice", email: "alice@example.com",
  hashedPassword: "x", emailVerified: true, createdAt: new Date(), updatedAt: new Date(),
};

const fakeList = { id: "list-1", name: "Home", ownerId: "user-1", createdAt: new Date(), updatedAt: new Date() };
const fakeItem = {
  id: "item-1", name: "Leche", quantity: "1L", category: "Lácteos",
  addedBy: "Alice (API)", month: 5, year: 2026, checked: false,
  listId: "list-1", createdAt: new Date(), updatedAt: new Date(),
};

function makeServer() {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerListTools(server, fakeUser);
  registerItemTools(server, fakeUser);
  registerPriceTools(server, fakeUser);
  return server;
}

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: (args: unknown) => unknown }> })._registeredTools;
  const tool = registered[name];
  if (!tool) throw new Error(`Tool not registered: ${name}`);
  return tool.handler(args);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// list_lists
// ---------------------------------------------------------------------------

describe("list_lists", () => {
  it("returns user lists as JSON text", async () => {
    vi.mocked(serviceGetUserLists).mockResolvedValue([fakeList] as never);
    const result = await callTool(makeServer(), "list_lists", {}) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].id).toBe("list-1");
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceGetUserLists).mockRejectedValue(new Error("DB error"));
    const result = await callTool(makeServer(), "list_lists", {}) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// create_list
// ---------------------------------------------------------------------------

describe("create_list", () => {
  it("creates and returns the new list", async () => {
    vi.mocked(serviceCreateList).mockResolvedValue(fakeList);
    const result = await callTool(makeServer(), "create_list", { name: "Compras" }) as { content: { text: string }[] };
    expect(vi.mocked(serviceCreateList)).toHaveBeenCalledWith("user-1", "Compras");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("list-1");
  });
});

// ---------------------------------------------------------------------------
// get_list
// ---------------------------------------------------------------------------

describe("get_list", () => {
  it("returns list + items for current month when month/year omitted", async () => {
    vi.mocked(serviceGetList).mockResolvedValue(fakeList as never);
    vi.mocked(serviceGetListItems).mockResolvedValue([fakeItem]);
    const result = await callTool(makeServer(), "get_list", { listId: "list-1" }) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("list-1");
    expect(parsed.items).toHaveLength(1);
  });

  it("uses provided month and year", async () => {
    vi.mocked(serviceGetList).mockResolvedValue(fakeList as never);
    vi.mocked(serviceGetListItems).mockResolvedValue([]);
    await callTool(makeServer(), "get_list", { listId: "list-1", month: 2, year: 2025 });
    expect(vi.mocked(serviceGetListItems)).toHaveBeenCalledWith("list-1", "user-1", 2, 2025);
  });

  it("returns isError when list not found", async () => {
    vi.mocked(serviceGetList).mockResolvedValue(null as never);
    const result = await callTool(makeServer(), "get_list", { listId: "bad" }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// add_item
// ---------------------------------------------------------------------------

describe("add_item", () => {
  it("adds item with addedBy = user name + (API)", async () => {
    vi.mocked(serviceAddListItem).mockResolvedValue(fakeItem);
    await callTool(makeServer(), "add_item", { listId: "list-1", name: "Leche" });
    expect(vi.mocked(serviceAddListItem)).toHaveBeenCalledWith(
      "list-1", "user-1", "Alice (API)",
      expect.objectContaining({ name: "Leche" })
    );
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceAddListItem).mockRejectedValue(new Error("DB error"));
    const result = await callTool(makeServer(), "add_item", { listId: "list-1", name: "Leche" }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toggle_item
// ---------------------------------------------------------------------------

describe("toggle_item", () => {
  it("toggles item checked state", async () => {
    vi.mocked(serviceToggleListItem).mockResolvedValue({ ...fakeItem, checked: true });
    await callTool(makeServer(), "toggle_item", { listId: "list-1", itemId: "item-1", checked: true });
    expect(vi.mocked(serviceToggleListItem)).toHaveBeenCalledWith("list-1", "user-1", "item-1", true);
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceToggleListItem).mockRejectedValue(new Error("DB error"));
    const result = await callTool(makeServer(), "toggle_item", { listId: "list-1", itemId: "item-1", checked: true }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// delete_item
// ---------------------------------------------------------------------------

describe("delete_item", () => {
  it("deletes item and returns ok", async () => {
    vi.mocked(serviceDeleteListItem).mockResolvedValue(undefined as never);
    const result = await callTool(makeServer(), "delete_item", { listId: "list-1", itemId: "item-1" }) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceDeleteListItem).mockRejectedValue(new Error("DB error"));
    const result = await callTool(makeServer(), "delete_item", { listId: "list-1", itemId: "item-1" }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rename_list
// ---------------------------------------------------------------------------

describe("rename_list", () => {
  it("renames the list and returns ok", async () => {
    vi.mocked(serviceUpdateList).mockResolvedValue(undefined as never);
    const result = await callTool(makeServer(), "rename_list", { listId: "list-1", name: "Nueva" }) as { content: { text: string }[] };
    expect(vi.mocked(serviceUpdateList)).toHaveBeenCalledWith("list-1", "user-1", "Nueva");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceUpdateList).mockRejectedValue(new Error("No autorizado"));
    const result = await callTool(makeServer(), "rename_list", { listId: "list-1", name: "Nueva" }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// delete_list
// ---------------------------------------------------------------------------

describe("delete_list", () => {
  it("deletes the list and returns ok", async () => {
    vi.mocked(serviceDeleteList).mockResolvedValue(undefined as never);
    const result = await callTool(makeServer(), "delete_list", { listId: "list-1" }) as { content: { text: string }[] };
    expect(vi.mocked(serviceDeleteList)).toHaveBeenCalledWith("list-1", "user-1");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceDeleteList).mockRejectedValue(new Error("No autorizado"));
    const result = await callTool(makeServer(), "delete_list", { listId: "list-1" }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// compare_prices
// ---------------------------------------------------------------------------

describe("compare_prices", () => {
  it("returns prices for requested items", async () => {
    const prices = { leche: [{ supermarket: "coto", price: 100 }] };
    vi.mocked(serviceGetItemPrices).mockResolvedValue(prices as never);
    const result = await callTool(makeServer(), "compare_prices", { listId: "list-1", items: ["leche"] }) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.leche).toBeDefined();
    expect(vi.mocked(serviceGetItemPrices)).toHaveBeenCalledWith("list-1", "user-1", ["leche"]);
  });

  it("returns isError on service failure", async () => {
    vi.mocked(serviceGetItemPrices).mockRejectedValue(new Error("Network error"));
    const result = await callTool(makeServer(), "compare_prices", { listId: "list-1", items: ["leche"] }) as { isError: boolean };
    expect(result.isError).toBe(true);
  });
});
