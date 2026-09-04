import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useRepositories } from "../../repositories/RepositoryContext";
import { useAsync } from "../../lib/useAsync";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  TextInput,
} from "../../components/ui";
import { t } from "../../i18n/copy";

export function CategoriesPage() {
  const { catalog } = useRepositories();
  const { can } = useAuth();
  const writable = can("catalog.write");
  const { data, loading, error, reload } = useAsync(
    () => catalog.listCategories(),
    [],
  );

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string>();
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await catalog.createCategory({ name: newName });
      setNewName("");
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: string) {
    setBusy(true);
    try {
      await catalog.renameCategory(id, editName);
      setEditingId(undefined);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title={t("categories.title")} />

      {writable && (
        <div className="mb-4 flex items-center gap-2">
          <TextInput
            placeholder={t("categories.field.name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button variant="primary" disabled={busy || !newName.trim()} onClick={create}>
            {t("categories.new")}
          </Button>
        </div>
      )}

      {loading && <Spinner label={t("common.loading")} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!loading && !error && (data ?? []).length === 0 && (
        <EmptyState title={t("categories.empty")} />
      )}

      {!loading && !error && (data ?? []).length > 0 && (
        <Card className="divide-y divide-[var(--border)]">
          {data!.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <TextInput
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <Button variant="primary" disabled={busy} onClick={() => rename(c.id)}>
                    {t("common.save")}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingId(undefined)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{c.name}</span>
                  {writable && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                    >
                      {t("common.edit")}
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
