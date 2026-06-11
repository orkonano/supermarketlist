const DESTRUCTIVE = "var(--destructive-500)";

export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      className="mb-4 px-4 py-3 rounded-lg text-sm border"
      style={{ background: "var(--destructive-50)", borderColor: DESTRUCTIVE, color: DESTRUCTIVE }}
    >
      {message}
    </div>
  );
}
