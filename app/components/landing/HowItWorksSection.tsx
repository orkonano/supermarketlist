import { steps } from "../../config/landing";

const PRIMARY = "var(--text-primary)";

export default function HowItWorksSection() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold text-center mb-10" style={{ color: PRIMARY }}>
        ¿Cómo funciona?
      </h2>
      <div className="grid sm:grid-cols-2 gap-6">
        {steps.map((s) => (
          <div key={s.step} className="flex gap-4 rounded-2xl p-5" style={{ background: "var(--surface-muted)" }}>
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: "var(--brand-500)", color: "white" }}
            >
              {s.step}
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: PRIMARY }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
