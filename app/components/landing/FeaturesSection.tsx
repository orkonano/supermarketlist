import { features } from "../../config/landing";

const PRIMARY = "var(--text-primary)";

export default function FeaturesSection() {
  return (
    <section className="px-4 py-16" style={{ background: "var(--surface-muted)" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: PRIMARY }}>
          Todo lo que necesitás
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-5 border"
              style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1" style={{ color: PRIMARY }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
