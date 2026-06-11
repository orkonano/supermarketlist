import Link from "next/link";
import HeroSection from "./components/landing/HeroSection";
import HowItWorksSection from "./components/landing/HowItWorksSection";
import PriceHighlightSection from "./components/landing/PriceHighlightSection";
import FeaturesSection from "./components/landing/FeaturesSection";
import DeveloperSection from "./components/landing/DeveloperSection";

export default function LandingPage() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return (
    <main className="min-h-screen" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
      <HeroSection />
      <HowItWorksSection />
      <PriceHighlightSection />
      <FeaturesSection />
      <DeveloperSection baseUrl={baseUrl} />

      <footer className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>
        Hecho con ❤️ para las familias que organizan sus compras juntas.
      </footer>

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
