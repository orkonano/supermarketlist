import Link from "next/link";
import { deleteList } from "@/lib/list-actions";

const SECONDARY = "var(--text-secondary)";

type ListCardData = {
  id: string;
  name: string;
  ownerId: string;
  owner: { name: string };
  _count: { members: number; items: number };
};

function ListCardActions({ listId, isOwner }: { listId: string; isOwner: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/lists/${listId}/share`}
        className="text-xs px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--surface-muted)]"
        style={{ color: SECONDARY }}
      >
        Compartir
      </Link>
      {isOwner && (
        <>
          <Link
            href={`/lists/${listId}?edit=1`}
            className="text-xs px-2 py-1.5 rounded-md transition-colors hover:bg-[var(--surface-muted)]"
            style={{ color: SECONDARY }}
          >
            Renombrar
          </Link>
          <form action={deleteList.bind(null, listId)}>
            <button
              type="submit"
              className="text-xs px-2 py-1.5 rounded-md transition-colors text-[var(--text-muted)] hover:bg-[var(--destructive-50)] hover:text-[var(--destructive-500)]"
            >
              Eliminar
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ListCard({ list, currentUserId }: { list: ListCardData; currentUserId: string }) {
  const isOwner = list.ownerId === currentUserId;

  return (
    <div
      data-testid="list-card"
      className="rounded-xl p-4 flex items-center justify-between border transition-shadow hover:shadow-md"
      style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
    >
      <div>
        <Link
          href={`/lists/${list.id}`}
          className="text-lg font-semibold transition-colors hover:underline"
          style={{ color: "var(--text-primary)" }}
        >
          {list.name}
        </Link>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {list._count.members} {list._count.members !== 1 ? "miembros" : "miembro"} ·{" "}
          {list._count.items} {list._count.items !== 1 ? "productos" : "producto"}
          {!isOwner && <span className="ml-1">· de {list.owner.name}</span>}
        </p>
      </div>

      <ListCardActions listId={list.id} isOwner={isOwner} />
    </div>
  );
}
