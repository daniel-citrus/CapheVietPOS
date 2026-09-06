import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { parseMoney } from "shared/domain";
import { useAuth } from "../../auth/AuthContext";
import { menuApi } from "../../api/menu";
import { useAsync } from "../../lib/useAsync";
import {
  Button,
  Card,
  Field,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from "../../components/ui";
import { t } from "../../i18n/copy";

interface DraftVariation {
  name: string;
  price: string;
}

export function ItemCreatePage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const categories = useAsync(() => menuApi.listCategories(), []);
  const modifierGroups = useAsync(() => menuApi.listModifierGroups(), []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [variations, setVariations] = useState<DraftVariation[]>([
    { name: "Regular", price: "" },
  ]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (!can("menu.write")) return <Navigate to="/items" replace />;

  function setVariation(index: number, patch: Partial<DraftVariation>) {
    setVariations((cur) =>
      cur.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  async function submit() {
    setError(undefined);
    const parsed = variations.map((v) => ({
      name: v.name.trim(),
      price: parseMoney(v.price),
    }));
    if (!name.trim()) return setError(t("error.generic"));
    if (parsed.some((v) => !v.name || !v.price)) {
      return setError(t("pricing.invalid"));
    }
    setSaving(true);
    try {
      const item = await menuApi.createItem({
        name,
        description,
        categoryId: categoryId || undefined,
        modifierGroupIds: groupIds,
        variations: parsed.map((v) => ({ name: v.name, price: v.price! })),
      });
      navigate(`/items/${item.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("items.new")} />
      <Card className="space-y-4 p-5">
        <Field label={t("item.field.name")} error={error}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label={t("item.field.description")}>
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label={t("item.field.category")}>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t("common.none")}</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium">
            {t("item.section.variations")}
          </span>
          <div className="space-y-2">
            {variations.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <TextInput
                  placeholder={t("item.variation.name")}
                  value={v.name}
                  onChange={(e) => setVariation(i, { name: e.target.value })}
                />
                <TextInput
                  placeholder="4.50"
                  value={v.price}
                  onChange={(e) => setVariation(i, { price: e.target.value })}
                />
                {variations.length > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setVariations((cur) => cur.filter((_, idx) => idx !== i))
                    }
                  >
                    {t("item.variation.remove")}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button
              onClick={() =>
                setVariations((cur) => [...cur, { name: "", price: "" }])
              }
            >
              {t("item.variation.add")}
            </Button>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">
            {t("item.section.modifierGroups")}
          </span>
          <div className="space-y-1.5">
            {(modifierGroups.data ?? []).map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={groupIds.includes(g.id)}
                  onChange={() =>
                    setGroupIds((cur) =>
                      cur.includes(g.id)
                        ? cur.filter((x) => x !== g.id)
                        : [...cur, g.id],
                    )
                  }
                />
                {g.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="primary" disabled={saving} onClick={submit}>
            {saving ? t("common.loading") : t("common.create")}
          </Button>
          <Button variant="ghost" onClick={() => navigate("/items")}>
            {t("common.cancel")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
