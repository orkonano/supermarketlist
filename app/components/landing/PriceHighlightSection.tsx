const PRIMARY = "var(--text-primary)";

const PRICE_FEATURES = [
  { label: "Por producto", desc: "Ves cuál super tiene el mejor precio para cada ítem de la lista." },
  { label: "Total estimado", desc: "Compará el gasto total en cada cadena de una sola mirada." },
  { label: "Caché de 4 horas", desc: "Los precios se actualizan automáticamente; no vas a estar viendo datos viejos." },
];

function Supermarket({ name }: { name: string }) {
  return <span className="font-semibold" style={{ color: PRIMARY }}>{name}</span>;
}

export default function PriceHighlightSection() {
  return (
    <section className="px-4 py-16" style={{ background: "var(--brand-50)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <div className="text-5xl mb-4">💰</div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: PRIMARY }}>
          ¿Dónde conviene hacer el super?
        </h2>
        <p className="mb-8 leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Agregás los productos a tu lista y la app busca automáticamente los precios en{" "}
          <Supermarket name="Coto" />, <Supermarket name="Disco" /> y <Supermarket name="Carrefour" />.
          El total más barato se resalta para que sepas dónde conviene ir.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 text-left">
          {PRICE_FEATURES.map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-2xl p-5 border"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
            >
              <h3 className="font-semibold mb-1" style={{ color: PRIMARY }}>{label}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
