import Link from "next/link";

const features = [
  {
    icon: "💰",
    title: "Comparación de precios",
    description:
      "Compará automáticamente los precios de tu lista en Coto, Disco y Carrefour. El total más barato se destaca en verde.",
  },
  {
    icon: "📋",
    title: "Múltiples listas",
    description:
      "Creá tantas listas como necesités: supermercado, ferretería, farmacia. Cada lista tiene su propio espacio.",
  },
  {
    icon: "📅",
    title: "Organización mensual",
    description:
      "Los productos se organizan por mes y año. Navegá entre meses para ver el historial de compras de tu familia.",
  },
  {
    icon: "🗂️",
    title: "Categorías automáticas",
    description:
      "Frutas y verduras, lácteos, carnes, limpieza y más. Los productos se agrupan solos para que el supermercado sea más rápido.",
  },
  {
    icon: "✅",
    title: "Tachá lo que ya compraste",
    description:
      "Marcá cada producto a medida que lo ponés en el changuito. Ves de un vistazo cuánto falta.",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Listas compartidas",
    description:
      "Invitá a tu familia o compañeros de casa por email. Todos ven los cambios en tiempo real.",
  },
  {
    icon: "🔒",
    title: "Tu cuenta, tus listas",
    description:
      "Registrate con email y contraseña. Tus listas son privadas y solo las ven quienes vos invitás.",
  },
];

const steps = [
  {
    step: "1",
    title: "Creá tu cuenta",
    description: "Registrate con tu email y verificá tu cuenta. Es gratis y solo lleva un minuto.",
  },
  {
    step: "2",
    title: "Creá una lista",
    description: "Dale un nombre a tu lista —por ejemplo «Super de mayo»— y empezá a agregar productos.",
  },
  {
    step: "3",
    title: "Agregá productos",
    description: "Nombre, cantidad y categoría. Podés agregar quién lo anotó para saber de dónde viene cada ítem.",
  },
  {
    step: "4",
    title: "Compartí con tu familia",
    description: "Invitá a quien quieras por email. Cada miembro puede agregar y tachar productos.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50 to-white px-4 pt-20 pb-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-6">🛒</div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            La lista del super,{" "}
            <span className="text-green-500">sin el caos</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Organizá las compras de tu casa por mes, por categoría y con toda
            tu familia. Sin papeles, sin WhatsApps perdidos.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-2xl shadow-md transition-colors text-lg"
          >
            Empezar gratis
          </Link>
          <p className="mt-4 text-sm text-gray-400">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-green-600 hover:underline font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
          ¿Cómo funciona?
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex gap-4 bg-gray-50 rounded-2xl p-5"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Price comparison highlight */}
      <section className="bg-green-50 px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            ¿Dónde conviene hacer el super?
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto">
            Agregás los productos a tu lista y la app busca automáticamente los precios en{" "}
            <span className="font-semibold text-gray-800">Coto</span>,{" "}
            <span className="font-semibold text-gray-800">Disco</span> y{" "}
            <span className="font-semibold text-gray-800">Carrefour</span>.
            El total más barato se resalta en verde para que sepas dónde conviene ir.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {[
              { label: "Por producto", desc: "Ves cuál super tiene el mejor precio para cada ítem de la lista." },
              { label: "Total estimado", desc: "Compará el gasto total en cada cadena de una sola mirada." },
              { label: "Caché de 4 horas", desc: "Los precios se actualizan automáticamente; no vas a estar viendo datos viejos." },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
            Todo lo que necesitás
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl shadow-sm p-5"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer API + MCP */}
      <section className="bg-gray-900 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-4xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Para developers
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
              Automatizá tus listas con la REST API o conectá tu asistente de IA
              directamente con el servidor MCP.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* REST API */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔌</span>
                <h3 className="text-white font-semibold">REST API</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Autenticación con API Key. Gestioná listas, productos y comparación de precios
                desde cualquier app o script.
              </p>
              <pre className="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto leading-relaxed">
{`curl /api/v1/lists \\
  -H "Authorization: Bearer sml_..."`}
              </pre>
              <ul className="mt-4 space-y-1 text-xs text-gray-500">
                <li>• CRUD de listas y productos</li>
                <li>• Comparación de precios en tiempo real</li>
                <li>• OAS 3.1 disponible en <code className="text-gray-400">docs/openapi.yaml</code></li>
              </ul>
            </div>

            {/* MCP Server */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤖</span>
                <h3 className="text-white font-semibold">MCP Server</h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Conectá Claude Desktop para gestionar tus listas con lenguaje natural,
                sin abrir la app.
              </p>
              <pre className="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto leading-relaxed">
{`// claude_desktop_config.json
{
  "mcpServers": {
    "supermarketlist": {
      "command": "npx",
      "args": ["mcp-remote",
        "https://tu-app/api/mcp",
        "--header",
        "Authorization: Bearer sml_..."]
    }
  }
}`}
              </pre>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-8">
            Generá tu API Key desde{" "}
            <span className="text-gray-400">Configuración → API Keys</span>{" "}
            una vez que estés logueado.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400">
        Hecho con ❤️ para las familias que organizan sus compras juntas.
      </footer>

      {/* Fixed login button — bottom right */}
      <Link
        href="/login"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-full shadow-lg transition-colors text-sm z-50"
      >
        Iniciar sesión →
      </Link>
    </main>
  );
}
