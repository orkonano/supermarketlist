"use client";

export default function ListError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h1>
        <p className="text-gray-500 text-sm mb-6">
          No pudimos cargar la lista. Puede ser un problema temporal.
        </p>
        <button
          onClick={reset}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-xl transition-colors text-sm"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
