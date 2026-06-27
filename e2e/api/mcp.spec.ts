import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { BASE_URL, readSeededKey, dbClient } from "./_helpers/client";

const MCP_URL = new URL(`${BASE_URL}/api/mcp`);

// The 9 tools registered in app/api/mcp/route.ts (lists + items + prices).
const EXPECTED_TOOLS = [
  "list_lists",
  "create_list",
  "get_list",
  "rename_list",
  "delete_list",
  "add_item",
  "toggle_item",
  "delete_item",
  "compare_prices",
].sort();

/**
 * Connects an SDK client to the live /api/mcp route. The transport sends the correct
 * `Accept: application/json, text/event-stream` header, parses the SSE response, and
 * performs the JSON-RPC `initialize` handshake on connect(). The Authorization header
 * rides along via requestInit.
 */
async function connectClient(key: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(MCP_URL, {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });
  const client = new Client({ name: "e2e-mcp-test", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

/** MCP tool results carry a JSON document inside the first text content block. */
function parseToolJson(result: unknown): any {
  const content = (result as { content?: { type: string; text?: string }[] }).content ?? [];
  const textBlock = content.find((c) => c.type === "text");
  if (!textBlock?.text) throw new Error("tool result had no text content");
  return JSON.parse(textBlock.text);
}

test.describe("MCP server — /api/mcp", () => {
  let client: Client;

  test.beforeAll(async () => {
    client = await connectClient(readSeededKey().rawKey);
  });

  test.afterAll(async () => {
    await client.close();
  });

  test("initialize handshake succeeds and lists exactly 9 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  test("create_list + add_item produce real DB rows", async () => {
    const db = dbClient();
    const listName = `MCP List ${Date.now()}`;

    // create_list → capture listId, assert the "List" row exists.
    const createRes = await client.callTool({
      name: "create_list",
      arguments: { name: listName },
    });
    const list = parseToolJson(createRes);
    const listId: string = list.id;
    expect(listId).toBeTruthy();

    const listRows = await db.execute({
      sql: `SELECT name FROM "List" WHERE id = ?`,
      args: [listId],
    });
    expect(listRows.rows).toHaveLength(1);
    expect(listRows.rows[0]!.name).toBe(listName);

    // add_item → assert the "Item" row exists in the DB (real mutation).
    const addRes = await client.callTool({
      name: "add_item",
      arguments: { listId, name: "Yerba" },
    });
    const item = parseToolJson(addRes);
    const itemId: string = item.id;
    expect(itemId).toBeTruthy();

    const itemRows = await db.execute({
      sql: `SELECT name, listId FROM "Item" WHERE id = ?`,
      args: [itemId],
    });
    expect(itemRows.rows).toHaveLength(1);
    expect(itemRows.rows[0]!.name).toBe("Yerba");
    expect(itemRows.rows[0]!.listId).toBe(listId);

    // toggle_item → row reflects checked = 1.
    await client.callTool({
      name: "toggle_item",
      arguments: { listId, itemId, checked: true },
    });
    const toggled = await db.execute({
      sql: `SELECT checked FROM "Item" WHERE id = ?`,
      args: [itemId],
    });
    expect(toggled.rows[0]!.checked).toBe(1);

    // delete_list → cleanup; the row disappears (cascade removes the item too).
    await client.callTool({ name: "delete_list", arguments: { listId } });
    const afterDelete = await db.execute({
      sql: `SELECT id FROM "List" WHERE id = ?`,
      args: [listId],
    });
    expect(afterDelete.rows).toHaveLength(0);

    db.close();
  });
});
