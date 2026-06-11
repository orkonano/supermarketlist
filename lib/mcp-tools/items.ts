import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { User } from "../../app/generated/prisma/client";
import {
  serviceAddListItem,
  serviceToggleListItem,
  serviceDeleteListItem,
} from "../list-service";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function handleAddItem(
  user: User,
  { listId, name, quantity, category }: { listId: string; name: string; quantity?: string; category?: string }
) {
  try {
    const now = new Date();
    const item = await serviceAddListItem(listId, user.id, `${user.name} (API)`, {
      name,
      quantity,
      category,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
    return text(item);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Error al agregar el producto.");
  }
}

async function handleToggleItem(
  user: User,
  { listId, itemId, checked }: { listId: string; itemId: string; checked: boolean }
) {
  try {
    return text(await serviceToggleListItem(listId, user.id, itemId, checked));
  } catch (e) {
    return err(e instanceof Error ? e.message : "Error al actualizar el producto.");
  }
}

async function handleDeleteItem(user: User, { listId, itemId }: { listId: string; itemId: string }) {
  try {
    await serviceDeleteListItem(listId, user.id, itemId);
    return text({ ok: true });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Error al eliminar el producto.");
  }
}

export function registerItemTools(server: McpServer, user: User) {
  server.tool(
    "add_item",
    "Agrega un producto a una lista.",
    {
      listId: z.string(),
      name: z.string().min(1),
      quantity: z.string().max(50).optional(),
      category: z.string().optional(),
    },
    (p) => handleAddItem(user, p)
  );

  server.tool(
    "toggle_item",
    "Marca o desmarca un producto como comprado.",
    { listId: z.string(), itemId: z.string(), checked: z.boolean() },
    (p) => handleToggleItem(user, p)
  );

  server.tool(
    "delete_item",
    "Elimina un producto de una lista.",
    { listId: z.string(), itemId: z.string() },
    (p) => handleDeleteItem(user, p)
  );
}
