import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import type { Category, Item } from "../../domain";
import { formatMoney } from "../../domain";
import { useCatalog, useRepositories } from "../../repositories/RepositoryContext";
import {
  bumpCatalogRevision,
  useCatalogRevision,
} from "../../repositories/catalogRevision";
import { ItemEditor } from "./ItemEditor";

const ALL = "__all__";
const ARCHIVED = "__archived__";

export function AdminView() {
  const catalog = useCatalog();
  const { source } = useRepositories();
  const { can } = useAuth();
  const canWrite = can("catalog.write");
  const revision = useCatalogRevision();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(ALL);
  const [editing, setEditing] = useState<Item | "new" | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const [nextItems, nextCategories] = await Promise.all([
        catalog.listItems({ includeArchived: true }),
        catalog.listCategories(),
      ]);
      setItems(nextItems);
      setCategories(nextCategories);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the catalog.",
      );
    } finally {
      setLoading(false);
    }
  }, [catalog]);

  useEffect(() => {
    refetch();
  }, [refetch, revision]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id?: string) => (id ? (map.get(id) ?? "—") : "Uncategorised");
  }, [categories]);

  const visible = useMemo(() => {
    if (filter === ARCHIVED) return items.filter((i) => i.archived);
    const active = items.filter((i) => !i.archived);
    if (filter === ALL) return active;
    return active.filter((i) => i.categoryId === filter);
  }, [items, filter]);

  const closeEditor = (changed: boolean) => {
    setEditing(null);
    if (changed) bumpCatalogRevision();
  };

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h2>Menu</h2>
        {canWrite && (
          <button
            className="btn btn--primary btn--sm"
            onClick={() => setEditing("new")}
          >
            + New item
          </button>
        )}
      </div>

      {source === "mock" && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
          Demo data — edits are in memory and reset on refresh.
        </p>
      )}
      {!canWrite && (
        <p style={{ fontSize: "0.78rem", color: "var(--danger)", margin: 0 }}>
          Viewing as staff — editing is disabled.
        </p>
      )}

      <div className="cat-filter">
        <button
          className={`chip ${filter === ALL ? "chip--active" : ""}`}
          onClick={() => setFilter(ALL)}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${filter === c.id ? "chip--active" : ""}`}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
        <button
          className={`chip ${filter === ARCHIVED ? "chip--active" : ""}`}
          onClick={() => setFilter(ARCHIVED)}
        >
          Archived
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="spinner" />}

      {!loading && visible.length === 0 && (
        <div className="empty">No items here yet.</div>
      )}

      <div className="item-list">
        {visible.map((item) => {
          const from = item.variations.reduce(
            (min, v) => (v.price.amount < min.amount ? v.price : min),
            item.variations[0]?.price ?? { amount: 0, currency: "USD" },
          );
          return (
            <button
              key={item.id}
              className={`item-card ${item.archived ? "archived" : ""}`}
              onClick={() => setEditing(item)}
            >
              <div className="top">
                <span className="name">{item.name}</span>
                <span className="price">
                  {item.variations.length > 1 ? "from " : ""}
                  {formatMoney(from)}
                </span>
              </div>
              {item.description && (
                <span className="desc">{item.description}</span>
              )}
              <div className="meta">
                <span className="tag">{categoryName(item.categoryId)}</span>
                {item.variations.length > 1 && (
                  <span className="tag">
                    {item.variations.map((v) => v.name).join(" / ")}
                  </span>
                )}
                {item.archived && <span className="tag">archived</span>}
              </div>
            </button>
          );
        })}
      </div>

      {editing && (
        <ItemEditor
          item={editing === "new" ? null : editing}
          categories={categories}
          canWrite={canWrite}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
