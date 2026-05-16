import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { User } from "../../app/generated/prisma";
import { serviceGetItemPrices } from "../price-service";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerPriceTools(server: McpServer, user: User) {
  server.tool(
    "compare_prices",
    "Compara precios de productos en Coto, Disco y Carrefour.",
    { listId: z.string(), items: z.array(z.string().min(1)).min(1) },
    async ({ listId, items }) => {
      try {
        return text(await serviceGetItemPrices(listId, user.id, items));
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error al obtener los precios.");
      }
    }
  );
}
