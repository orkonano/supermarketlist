import Link from "next/link";
import McpSnippets from "./components/McpSnippets";
import { features, steps } from "./config/landing";

export default function LandingPage() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return (
    <main className="min-h-screen" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
      {/* Hero */}
      <section
        className="px-4 pt-24 pb-20 text-center"
        style={{ background: "linear-gradient(to bottom, var(--brand-50), var(--surface))" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-7xl mb-8">🛒</div>
          <h1
            className="text-5xl sm:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            La lista del super,{" "}
            <em className="not-italic" style={{ color: "var(--brand-500)" }}>sin el caos</em>
          </h1>
          <p className="text-lg mb-10 leading-relaxed max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Organizá las compras de tu casa por mes, por categoría y con toda
            tu familia. Sin papeles, sin WhatsApps perdidos.
          </p>
          <Link
            href="/signup"
            className="inline-block font-bold px-8 py-4 rounded-xl shadow-md transition-colors text-lg"
            style={{ background: "var(--brand-500)", color: "white" }}
          >
            Empezar gratis
          </Link>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--brand-600)" }}>
              Iniciá sesión
            </Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: "var(--text-primary)" }}>
          ¿Cómo funciona?
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex gap-4 rounded-2xl p-5"
              style={{ background: "var(--surface-muted)" }}
            >
              <div
                className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: "var(--brand-500)", color: "white" }}
              >
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Price comparison highlight */}
      <section className="px-4 py-16" style={{ background: "var(--brand-50)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            ¿Dónde conviene hacer el super?
          </h2>
          <p className="mb-8 leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Agregás los productos a tu lista y la app busca automáticamente los precios en{" "}
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Coto</span>,{" "}
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Disco</span> y{" "}
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Carrefour</span>.
            El total más barato se resalta para que sepas dónde conviene ir.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {[
              { label: "Por producto", desc: "Ves cuál super tiene el mejor precio para cada ítem de la lista." },
              { label: "Total estimado", desc: "Compará el gasto total en cada cadena de una sola mirada." },
              { label: "Caché de 4 horas", desc: "Los precios se actualizan automáticamente; no vas a estar viendo datos viejos." },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className="rounded-2xl p-5 border"
                style={{ background: "var(--surface-raised)", borderColor: "var(--border)" }}
              >
                <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16" style={{ background: "var(--surface-muted)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10" style={{ color: "var(--text-primary)" }}>
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
                <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer API + MCP */}
      <section className="px-4 py-16" style={{ background: "oklch(14% 0.01 85)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Para developers
            </h2>
            <p className="max-w-xl mx-auto leading-relaxed" style={{ color: "oklch(60% 0.01 85)" }}>
              Automatizá tus listas con la REST API o conectá tu asistente de IA
              directamente con el servidor MCP.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6" style={{ background: "oklch(20% 0.01 85)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔌</span>
                <h3 className="text-white font-semibold">REST API</h3>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(60% 0.01 85)" }}>
                Autenticación con API Key. Gestioná listas, productos y comparación de precios
                desde cualquier app o script.
              </p>
              <pre className="rounded-lg p-3 text-xs overflow-x-auto leading-relaxed" style={{ background: "oklch(10% 0 0)", color: "var(--brand-400)" }}>
{`curl /api/v1/lists \\
  -H "Authorization: Bearer sml_..."`}
              </pre>
              <ul className="mt-4 space-y-1 text-xs" style={{ color: "oklch(50% 0.01 85)" }}>
                <li>• CRUD de listas y productos</li>
                <li>• Comparación de precios en tiempo real</li>
                <li>• OAS 3.1: <a href="/docs" className="underline underline-offset-2 hover:text-white" style={{ color: "oklch(70% 0.01 85)" }}>Explorador interactivo →</a> · <a href="/openapi.yaml" className="underline underline-offset-2 hover:text-white" style={{ color: "oklch(50% 0.01 85)" }}>openapi.yaml</a></li>
              </ul>
            </div>

            <div className="rounded-2xl p-6" style={{ background: "oklch(20% 0.01 85)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤖</span>
                <h3 className="text-white font-semibold">MCP Server</h3>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(60% 0.01 85)" }}>
                Conectá tu herramienta de IA favorita para gestionar tus listas con
                lenguaje natural, sin abrir la app.
              </p>
              <McpSnippets baseUrl={baseUrl} />
            </div>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: "oklch(45% 0.01 85)" }}>
            Generá tu API Key desde{" "}
            <span style={{ color: "oklch(60% 0.01 85)" }}>Configuración → API Keys</span>{" "}
            una vez que estés logueado.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
        Hecho con ❤️ para las familias que organizan sus compras juntas.
      </footer>

      {/* Fixed login button */}
      <Link
        href="/login"
        className="fixed bottom-6 right-6 font-semibold px-5 py-3 rounded-full shadow-lg transition-colors text-sm z-50"
        style={{ background: "var(--brand-500)", color: "white" }}
      >
        Iniciá sesión →
      </Link>
    </main>
  );
}
