import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useRepositories } from "../../repositories/RepositoryContext";
import { useAsync } from "../../lib/useAsync";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  TextInput,
} from "../../components/ui";
import { t } from "../../i18n/copy";
import { priceRange } from "./priceRange";

export function ItemsListPage() {
  const { catalog } = useRepositories();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => catalog.listItems({ includeArchived: true }),
    [],
  );
  const categories = useAsync(() => catalog.listCategories(), []);
  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id?: string) => (id ? map.get(id) ?? "—" : "—");
  }, [categories.data]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((i) => (showArchived ? true : !i.archived))
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, query, showArchived]);

  return (
    <div>
      <PageHeader
        title={t("items.title")}
        actions={
          can("catalog.write") ? (
            <Button variant="primary" onClick={() => navigate("/items/new")}>
              {t("items.new")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-3 flex items-center gap-3">
        <div className="w-64">
          <TextInput
            placeholder={t("items.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          {t("items.showArchived")}
        </label>
      </div>

      {loading && <Spinner label={t("common.loading")} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState title={t("items.empty")} />
      )}

      {!loading && !error && items.length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">{t("items.col.name")}</th>
                <th className="px-4 py-2 font-medium">{t("items.col.category")}</th>
                <th className="px-4 py-2 font-medium">{t("items.col.variations")}</th>
                <th className="px-4 py-2 font-medium">{t("items.col.priceRange")}</th>
                <th className="px-4 py-2 font-medium">{t("items.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/items/${item.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">
                    {categoryName(item.categoryId)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted)]">
                    {item.variations.map((v) => v.name).join(", ")}
                  </td>
                  <td className="px-4 py-2.5">{priceRange(item)}</td>
                  <td className="px-4 py-2.5">
                    {item.archived ? (
                      <Badge tone="amber">{t("items.status.archived")}</Badge>
                    ) : (
                      <Badge tone="green">{t("items.status.active")}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
