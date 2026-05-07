export default function VerificationBanner({ verified, error }: { verified?: boolean; error?: string }) {
  if (verified) {
    return (
      <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        Tu correo fue verificado. ¡Bienvenido!
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
        El enlace de verificación es inválido o ya fue utilizado.
      </div>
    );
  }

  return null;
}
