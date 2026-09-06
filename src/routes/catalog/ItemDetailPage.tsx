import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Item } from "shared/domain";
import { formatMoney } from "shared/domain";
import { useAuth } from "../../auth/AuthContext";
import { useRepositories } from "../../repositories/RepositoryContext";
import { useAsync } from "../../lib/useAsync";
import { ItemThumbnail } from "../../components/ItemThumbnail";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  Select,
  Spinner,
  TextArea,
  TextInput,
} from "../../components/ui";
import { t } from "../../i18n/copy";

export function ItemDetailPage() {
  const { itemId = "" } = useParams();
  const { catalog, source } = useRepositories();
  const { can } = useAuth();
  const navigate = useNavigate();

  const item = useAsync(() => catalog.getItem(itemId), [itemId]);
  const categories = useAsync(() => catalog.listCategories(), []);
  const modifierGroups = useAsync(() => catalog.listModifierGroups(), []);

  if (item.loading) return <Spinner label={t("common.loading")} />;
  if (item.error || !item.data) {
    return <ErrorState message={item.error?.message ?? t("error.generic")} onRetry={item.reload} />;
  }

  const writable = can("catalog.write");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={item.data.name}
        actions={
          <>
            <Link to="/items">
              <Button variant="ghost">← {t("items.title")}</Button>
            </Link>
            {writable && (
              <Button
                variant={item.data.archived ? "secondary" : "danger"}
                onClick={async () => {
                  await catalog.setItemArchived(item.data!.id, !item.data!.archived);
                  item.reload();
                }}
              >
                {item.data.archived ? t("common.unarchive") : t("common.archive")}
              </Button>
            )}
          </>
        }
      />

      {item.data.archived && (
        <div className="mb-4">
          <Badge tone="amber">{t("items.status.archived")}</Badge>
        </div>
      )}
      {!writable && (
        <p className="mb-4 text-sm text-[var(--muted)]">{t("common.readOnlyNotice")}</p>
      )}

      <ImageSection
        item={item.data}
        writable={writable}
        canEdit={source !== "square"}
        onSaved={item.reload}
      />

      <DetailsSection
        item={item.data}
        categories={categories.data ?? []}
        writable={writable}
        onSaved={item.reload}
      />

      <VariationsSection item={item.data} writable={writable} onChanged={item.reload} />

      <ModifierGroupsSection
        item={item.data}
        groups={modifierGroups.data ?? []}
        writable={writable}
        onSaved={item.reload}
      />

      {writable && (
        <p className="mt-6 text-xs text-[var(--muted)]">
          Prices are edited on the{" "}
          <Link to="/pricing" className="text-[var(--accent)] hover:underline">
            {t("nav.pricing")}
          </Link>{" "}
          screen.
        </p>
      )}

      <div className="mt-2">
        <Button variant="ghost" onClick={() => navigate("/items")}>
          {t("items.title")}
        </Button>
      </div>
    </div>
  );
}

function ImageSection({
  item,
  writable,
  canEdit,
  onSaved,
}: {
  item: Item;
  writable: boolean;
  /** false when the catalog source is Square — see setItemImage. */
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { catalog } = useRepositories();
  const [url, setUrl] = useState(item.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setUrl(item.imageUrl ?? ""), [item]);

  const dirty = url !== (item.imageUrl ?? "");

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await catalog.setItemImage(item.id, url.trim() || null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t("item.section.image")}
      </h2>
      <div className="flex items-start gap-4">
        <ItemThumbnail item={item} size={80} />
        <div className="flex-1">
          {writable && canEdit ? (
            <Field label={t("item.image.url")} error={error} hint={t("item.image.hint")}>
              <TextInput
                value={url}
                placeholder="https://…"
                onChange={(e) => setUrl(e.target.value)}
              />
            </Field>
          ) : (
            !item.imageUrl && (
              <p className="text-sm text-[var(--muted)]">
                {writable ? t("item.image.squareNotice") : t("item.image.hint")}
              </p>
            )
          )}
          {writable && canEdit && (
            <div className="mt-3">
              <Button variant="primary" disabled={!dirty || saving} onClick={save}>
                {saving ? t("common.loading") : t("common.save")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function DetailsSection({
  item,
  categories,
  writable,
  onSaved,
}: {
  item: Item;
  categories: { id: string; name: string }[];
  writable: boolean;
  onSaved: () => void;
}) {
  const { catalog } = useRepositories();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [categoryId, setCategoryId] = useState(item.categoryId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setName(item.name);
    setDescription(item.description ?? "");
    setCategoryId(item.categoryId ?? "");
  }, [item]);

  const dirty =
    name !== item.name ||
    description !== (item.description ?? "") ||
    categoryId !== (item.categoryId ?? "");

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await catalog.updateItem(item.id, {
        name,
        description,
        categoryId: categoryId || null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t("item.section.details")}
      </h2>
      <div className="space-y-4">
        <Field label={t("item.field.name")} error={error}>
          <TextInput
            value={name}
            disabled={!writable}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t("item.field.description")}>
          <TextArea
            rows={2}
            value={description}
            disabled={!writable}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label={t("item.field.category")}>
          <Select
            value={categoryId}
            disabled={!writable}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t("common.none")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {writable && (
        <div className="mt-4">
          <Button variant="primary" disabled={!dirty || saving} onClick={save}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function VariationsSection({
  item,
  writable,
  onChanged,
}: {
  item: Item;
  writable: boolean;
  onChanged: () => void;
}) {
  const { catalog } = useRepositories();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string>();

  async function addVariation() {
    setError(undefined);
    try {
      await catalog.addVariation(item.id, {
        name: newName,
        price: { amount: 0, currency: item.variations[0]?.price.currency ?? "USD" },
      });
      setNewName("");
      setAdding(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
    }
  }

  async function removeVariation(variationId: string) {
    setError(undefined);
    try {
      await catalog.removeVariation(item.id, variationId);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t("item.section.variations")}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="pb-2 font-medium">{t("item.variation.name")}</th>
            <th className="pb-2 font-medium">{t("item.variation.price")}</th>
            <th className="pb-2 font-medium">{t("item.variation.sku")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {item.variations.map((v) => (
            <tr key={v.id} className="border-t border-[var(--border)]">
              <td className="py-2">{v.name}</td>
              <td className="py-2">{formatMoney(v.price)}</td>
              <td className="py-2 text-[var(--muted)]">{v.sku ?? "—"}</td>
              <td className="py-2 text-right">
                {writable && item.variations.length > 1 && (
                  <Button variant="ghost" onClick={() => removeVariation(v.id)}>
                    {t("item.variation.remove")}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {writable && (
        <div className="mt-3">
          {adding ? (
            <div className="flex items-center gap-2">
              <TextInput
                autoFocus
                placeholder={t("item.variation.name")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button variant="primary" disabled={!newName.trim()} onClick={addVariation}>
                {t("common.add")}
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setAdding(true)}>{t("item.variation.add")}</Button>
          )}
        </div>
      )}
    </Card>
  );
}

function ModifierGroupsSection({
  item,
  groups,
  writable,
  onSaved,
}: {
  item: Item;
  groups: { id: string; name: string }[];
  writable: boolean;
  onSaved: () => void;
}) {
  const { catalog } = useRepositories();
  const [selected, setSelected] = useState<string[]>(item.modifierGroupIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelected(item.modifierGroupIds), [item]);

  const dirty =
    selected.length !== item.modifierGroupIds.length ||
    selected.some((id) => !item.modifierGroupIds.includes(id));

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function save() {
    setSaving(true);
    try {
      await catalog.updateItem(item.id, { modifierGroupIds: selected });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t("item.section.modifierGroups")}
      </h2>
      <p className="mb-3 text-xs text-[var(--muted)]">{t("item.modifierGroups.help")}</p>
      <div className="space-y-1.5">
        {groups.map((g) => (
          <label key={g.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(g.id)}
              disabled={!writable}
              onChange={() => toggle(g.id)}
            />
            {g.name}
          </label>
        ))}
      </div>
      {writable && (
        <div className="mt-4">
          <Button variant="primary" disabled={!dirty || saving} onClick={save}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      )}
    </Card>
  );
}
