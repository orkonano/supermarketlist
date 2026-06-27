const BRAND_600 = "var(--brand-600)";

export default function NewKeyBanner({ createdKey }: { createdKey: string }) {
  return (
    <div
      className="mb-6 p-4 border rounded-xl"
      style={{ background: "var(--brand-50)", borderColor: "var(--brand-400)" }}
    >
      <p className="text-sm font-semibold mb-2" style={{ color: BRAND_600 }}>
        ¡API Key creada! Guardala ahora — no la vamos a mostrar de nuevo.
      </p>
      <code
        className="block text-xs font-mono break-all px-3 py-2 rounded-lg"
        style={{ background: "color-mix(in oklch, var(--brand-500) 12%, white)", color: BRAND_600 }}
      >
        {createdKey}
      </code>
      <div className="mt-3">
        <a
          href={`/docs?token=${encodeURIComponent(createdKey)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium underline underline-offset-2 transition-colors text-[var(--brand-500)] hover:text-[var(--brand-600)]"
        >
          Probar en el explorador →
        </a>
      </div>
    </div>
  );
}
