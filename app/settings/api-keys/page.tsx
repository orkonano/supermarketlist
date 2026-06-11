import { verifySession, getCurrentUser } from "@/lib/dal";
import { getUserApiKeys } from "@/lib/api-key-actions";
import AppShell from "@/app/components/AppShell";
import PageHeader from "@/app/components/PageHeader";
import ErrorBanner from "@/app/components/ErrorBanner";
import NewKeyBanner from "./NewKeyBanner";
import CreateApiKeyForm from "./CreateApiKeyForm";
import ApiKeyList from "./ApiKeyList";

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const session = await verifySession();
  const [keys, params, user] = await Promise.all([
    getUserApiKeys(),
    searchParams,
    getCurrentUser(session.userId),
  ]);

  return (
    <AppShell userName={user?.name ?? ""}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PageHeader backHref="/lists" backLabel="Volver" title="API Keys" className="mb-2" />
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Conectá herramientas externas como Claude. Cada key da acceso completo — nunca la compartás.
        </p>

        <ErrorBanner message={params.error} />

        {params.created && <NewKeyBanner createdKey={params.created} />}

        <CreateApiKeyForm />

        <ApiKeyList keys={keys} />
      </div>
    </AppShell>
  );
}
