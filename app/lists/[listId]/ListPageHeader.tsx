import Link from "next/link";

const MUTED = "var(--text-muted)";

export default function ListPageHeader({
  listId,
  listName,
  isOwner,
}: {
  listId: string;
  listName: string;
  isOwner: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <Link href="/lists" className="text-sm transition-colors" style={{ color: MUTED }}>
        ← Listas
      </Link>
      <span style={{ color: "var(--border-strong)" }}>/</span>
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {listName}
      </h1>
      <div className="ml-auto flex items-center gap-1">
        <Link
          href={`/lists/${listId}/share`}
          className="text-xs px-2 py-1 rounded-md transition-colors"
          style={{ color: "var(--brand-500)" }}
        >
          Compartir
        </Link>
        {isOwner && (
          <Link
            href={`/lists/${listId}?edit=1`}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{ color: MUTED }}
          >
            Renombrar
          </Link>
        )}
      </div>
    </div>
  );
}
