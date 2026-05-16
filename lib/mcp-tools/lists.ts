import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { User } from "../../app/generated/prisma";
import {
  serviceGetUserLists,
  serviceCreateList,
  serviceGetList,
  serviceUpdateList,
  serviceDeleteList,
} from "../list-service";

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerListTools(server: McpServer, user: User) {
  server.tool("list_lists", "Devuelve todas las listas del usuario.", {}, async () => {
    try {
      return text(await serviceGetUserLists(user.id));
    } catch (e) {
      return err(e instanceof Error ? e.message : "Error al obtener las listas.");
    }
  });

  server.tool("create_list", "Crea una nueva lista.", { name: z.string().min(1).max(100) }, async ({ name }) => {
    try {
      return text(await serviceCreateList(user.id, name));
    } catch (e) {
      return err(e instanceof Error ? e.message : "Error al crear la lista.");
    }
  });

  server.tool(
    "get_list",
    "Devuelve el detalle de una lista junto con sus productos del mes/año indicado.",
    {
      listId: z.string(),
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().min(2000).max(2100).optional(),
    },
    async ({ listId, month, year }) => {
      try {
        const list = await serviceGetList(listId, user.id);
        if (!list) return err("Lista no encontrada.");
        const now = new Date();
        const { serviceGetListItems } = await import("../list-service");
        const items = await serviceGetListItems(listId, user.id, month ?? now.getMonth() + 1, year ?? now.getFullYear());
        return text({ ...list, items });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error al obtener la lista.");
      }
    }
  );

  server.tool(
    "rename_list",
    "Renombra una lista (sólo el dueño puede renombrarla).",
    { listId: z.string(), name: z.string().min(1).max(100) },
    async ({ listId, name }) => {
      try {
        await serviceUpdateList(listId, user.id, name);
        return text({ ok: true });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error al renombrar la lista.");
      }
    }
  );

  server.tool(
    "delete_list",
    "Elimina una lista (sólo el dueño puede eliminarla).",
    { listId: z.string() },
    async ({ listId }) => {
      try {
        await serviceDeleteList(listId, user.id);
        return text({ ok: true });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Error al eliminar la lista.");
      }
    }
  );
}
