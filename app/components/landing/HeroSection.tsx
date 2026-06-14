import Link from "next/link";

export default function HeroSection() {
  return (
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
          className="inline-block font-bold px-8 py-4 rounded-xl shadow-md transition-colors text-lg text-white bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
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
  );
}
