import { createApiKey } from "@/lib/api-key-actions";
import SectionCard from "@/app/components/SectionCard";

const RADIUS_MD = "var(--radius-md)";

export default function CreateApiKeyForm() {
  return (
    <SectionCard title="Generá una nueva API Key" className="mb-6">
      <form
        action={async (formData: FormData) => {
          "use server";
          const name = formData.get("name") as string;
          const result = await createApiKey(name);
          const { redirect } = await import("next/navigation");
          if ("error" in result) {
            redirect(`/settings/api-keys?error=${encodeURIComponent(result.error ?? "")}`);
          }
          redirect(`/settings/api-keys?created=${encodeURIComponent(result.key ?? "")}`);
        }}
        className="flex gap-3"
      >
        <input
          type="text"
          name="name"
          placeholder="ej: Claude Desktop"
          required
          className="flex-1 px-3 py-2 text-sm focus:outline-none transition-colors"
          style={{
            borderRadius: RADIUS_MD,
            border: "1.5px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold text-white transition-colors flex-shrink-0 bg-[var(--brand-500)] hover:bg-[var(--brand-600)]"
          style={{ borderRadius: RADIUS_MD }}
        >
          Crear
        </button>
      </form>
    </SectionCard>
  );
}
