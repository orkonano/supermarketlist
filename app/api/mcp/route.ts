import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { withApiKey, ApiAuthError } from "@/lib/api-auth";
import { registerListTools } from "@/lib/mcp-tools/lists";
import { registerItemTools } from "@/lib/mcp-tools/items";
import { registerPriceTools } from "@/lib/mcp-tools/prices";

async function handleMcp(req: Request): Promise<Response> {
  const auth = await withApiKey(req);

  const server = new McpServer({ name: "supermarketlist", version: "1.0.0" });
  registerListTools(server, auth.user);
  registerItemTools(server, auth.user);
  registerPriceTools(server, auth.user);

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(req);
}

const UNAUTHORIZED_ERROR = "No autorizado";

async function handleMcpRequest(req: Request): Promise<Response> {
  try {
    return await handleMcp(req);
  } catch (e) {
    if (e instanceof ApiAuthError) {
      return Response.json({ error: UNAUTHORIZED_ERROR }, { status: 401 });
    }
    throw e;
  }
}

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
