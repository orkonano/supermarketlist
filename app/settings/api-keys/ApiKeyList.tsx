import ApiKeyCard from "./ApiKeyCard";

type ApiKeyData = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

export default function ApiKeyList({ keys }: { keys: ApiKeyData[] }) {
  return (
    <div className="space-y-3">
      {keys.length === 0 ? (
        <div
          className="text-center py-12 border-2 border-dashed"
          style={{
            borderColor: "var(--border)",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-muted)",
          }}
        >
          <div className="text-3xl mb-3">🔑</div>
          <p className="text-sm">Todavía no tenés API Keys.</p>
        </div>
      ) : (
        keys.map((key) => <ApiKeyCard key={key.id} apiKey={key} />)
      )}
    </div>
  );
}
