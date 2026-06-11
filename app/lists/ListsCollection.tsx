import ListCard from "./ListCard";

type ListCardData = {
  id: string;
  name: string;
  ownerId: string;
  owner: { name: string };
  _count: { members: number; items: number };
};

export default function ListsCollection({
  lists,
  currentUserId,
}: {
  lists: ListCardData[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-3 mb-6">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} currentUserId={currentUserId} />
      ))}

      {lists.length === 0 && (
        <div
          className="text-center py-16 rounded-xl border-2 border-dashed"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <div className="text-5xl mb-4">🛒</div>
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
            Todavía no tenés listas.
          </p>
          <p className="text-sm mt-1">¡Creá tu primera lista abajo!</p>
        </div>
      )}
    </div>
  );
}
