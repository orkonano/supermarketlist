export default function VerificationBanner({ verified, error }: { verified?: boolean; error?: string }) {
  if (verified) {
    return (
      <div
        className="mb-6 px-4 py-3 rounded-lg text-sm border"
        style={{
          background: "var(--brand-50)",
          borderColor: "var(--brand-400)",
          color: "var(--brand-600)",
        }}
      >
        Tu correo fue verificado. ¡Bienvenido!
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mb-6 px-4 py-3 rounded-lg text-sm border"
        style={{
          background: "var(--destructive-50)",
          borderColor: "var(--destructive-500)",
          color: "var(--destructive-500)",
        }}
      >
        El enlace de verificación es inválido o ya fue utilizado.
      </div>
    );
  }

  return null;
}
