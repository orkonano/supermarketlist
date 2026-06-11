import McpSnippets from "../McpSnippets";

const MUTED_DARK = "oklch(60% 0.01 85)";
const CARD_BG = "oklch(20% 0.01 85)";

function RestApiCard() {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD_BG }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔌</span>
        <h3 className="text-white font-semibold">REST API</h3>
      </div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: MUTED_DARK }}>
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
  );
}

function McpServerCard({ baseUrl }: { baseUrl: string }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD_BG }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="text-white font-semibold">MCP Server</h3>
      </div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: MUTED_DARK }}>
        Conectá tu herramienta de IA favorita para gestionar tus listas con
        lenguaje natural, sin abrir la app.
      </p>
      <McpSnippets baseUrl={baseUrl} />
    </div>
  );
}

export default function DeveloperSection({ baseUrl }: { baseUrl: string }) {
  return (
    <section className="px-4 py-16" style={{ background: "oklch(14% 0.01 85)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-white mb-3">Para developers</h2>
          <p className="max-w-xl mx-auto leading-relaxed" style={{ color: MUTED_DARK }}>
            Automatizá tus listas con la REST API o conectá tu asistente de IA
            directamente con el servidor MCP.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <RestApiCard />
          <McpServerCard baseUrl={baseUrl} />
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "oklch(45% 0.01 85)" }}>
          Generá tu API Key desde{" "}
          <span style={{ color: MUTED_DARK }}>Configuración → API Keys</span>{" "}
          una vez que estés logueado.
        </p>
      </div>
    </section>
  );
}
