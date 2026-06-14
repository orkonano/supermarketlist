import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { BASE_URL } from "./_helpers/client";

const MCP_URL = new URL(`${BASE_URL}/api/mcp`);

test("MCP connect with bogus API key is rejected", async () => {
  // withApiKey runs before the JSON-RPC layer (app/api/mcp/route.ts:9), so a bad key
  // returns HTTP 401 and the transport rejects connect() — never reaching initialize.
  const transport = new StreamableHTTPClientTransport(MCP_URL, {
    requestInit: { headers: { Authorization: "Bearer sml_bogus" } },
  });
  const client = new Client({ name: "e2e-mcp-negative", version: "1.0.0" });

  await expect(client.connect(transport)).rejects.toThrow();

  await transport.close().catch(() => {});
});
