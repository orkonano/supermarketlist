type Invite = {
  id: string;
  email: string;
  expiresAt: Date;
};

export default function PendingInvitesList({ invites }: { invites: Invite[] }) {
  return (
    <ul className="space-y-2">
      {invites.map((inv) => (
        <li key={inv.id} className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--text-secondary)" }}>{inv.email}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            vence {new Date(inv.expiresAt).toLocaleDateString("es-AR")}
          </span>
        </li>
      ))}
    </ul>
  );
}
