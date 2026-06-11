type Member = {
  userId: string;
  user: { name: string; email: string };
};

export default function MembersList({ members, ownerId }: { members: Member[]; ownerId: string }) {
  return (
    <ul className="space-y-3">
      {members.map((m) => {
        const isOwner = m.userId === ownerId;
        return (
          <li key={m.userId} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "var(--brand-500)" }}
              >
                {m.user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {m.user.name}
              </span>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={
                isOwner
                  ? { background: "var(--brand-50)", color: "var(--brand-600)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {isOwner ? "propietario" : m.user.email}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
