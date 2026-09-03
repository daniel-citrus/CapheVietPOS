import { useState } from "react";
import type { Category, Item } from "../../domain";
import { formatMoney, parseMoney } from "../../domain";
import { useCatalog } from "../../repositories/RepositoryContext";

interface Props {
  item: Item | null;
  categories: Category[];
  canWrite: boolean;
  onClose: (changed: boolean) => void;
}

interface VarDraft {
  id?: string;
  name: string;
  priceText: string;
  originalName?: string;
  originalAmount?: number;
}

function toDraft(item: Item | null): {
  name: string;
  description: string;
  categoryId: string;
  archived: boolean;
  variations: VarDraft[];
} {
  if (!item) {
    return {
      name: "",
      description: "",
      categoryId: "",
      archived: false,
      variations: [{ name: "Regular", priceText: "" }],
    };
  }
  return {
    name: item.name,
    description: item.description ?? "",
    categoryId: item.categoryId ?? "",
    archived: item.archived,
    variations: item.variations.map((v) => ({
      id: v.id,
      name: v.name,
      priceText: (v.price.amount / 100).toFixed(2),
      originalName: v.name,
      originalAmount: v.price.amount,
    })),
  };
}

export function ItemEditor({ item, categories, canWrite, onClose }: Props) {
  const catalog = useCatalog();
  const isNew = item === null;
  const initial = toDraft(item);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [archived, setArchived] = useState(initial.archived);
  const [variations, setVariations] = useState<VarDraft[]>(initial.variations);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canWrite;

  const setVar = (idx: number, next: Partial<VarDraft>) =>
    setVariations((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, ...next } : v)),
    );

  const addVar = () =>
    setVariations((prev) => [...prev, { name: "", priceText: "" }]);

  const removeVar = (idx: number) =>
    setVariations((prev) => prev.filter((_, i) => i !== idx));

  const validate = (): string | null => {
    if (!name.trim()) return "Name is required.";
    if (variations.length === 0) return "Add at least one variation.";
    for (const v of variations) {
      if (!v.name.trim()) return "Every variation needs a name.";
      if (!parseMoney(v.priceText)) return `"${v.priceText || "—"}" is not a valid price.`;
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await catalog.createItem({
          name: name.trim(),
          description: description.trim() || undefined,
          categoryId: categoryId || undefined,
          variations: variations.map((v) => ({
            name: v.name.trim(),
            price: parseMoney(v.priceText)!,
          })),
        });
      } else {
        const id = item.id;
        if (
          name.trim() !== item.name ||
          (description.trim() || undefined) !== item.description ||
          (categoryId || undefined) !== item.categoryId
        ) {
          await catalog.updateItem(id, {
            name: name.trim(),
            description: description.trim(),
            categoryId: categoryId || null,
          });
        }

        for (const v of variations) {
          const price = parseMoney(v.priceText)!;
          if (!v.id) {
            await catalog.addVariation(id, { name: v.name.trim(), price });
            continue;
          }
          if (v.name.trim() !== v.originalName) {
            await catalog.updateVariation(id, v.id, { name: v.name.trim() });
          }
          if (price.amount !== v.originalAmount) {
            await catalog.setVariationPrice(id, v.id, price);
          }
        }

        const keptIds = new Set(variations.map((v) => v.id).filter(Boolean));
        for (const original of item.variations) {
          if (!keptIds.has(original.id)) {
            await catalog.removeVariation(id, original.id);
          }
        }

        if (archived !== item.archived) {
          await catalog.setItemArchived(id, archived);
        }
      }
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={() => onClose(false)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        <div className="sheet-head">
          <h3>{isNew ? "New item" : name || "Item"}</h3>
          <button className="icon-btn" onClick={() => onClose(false)}>
            ✕
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="input"
            value={name}
            disabled={readOnly}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cà phê sữa đá"
          />
        </label>

        <label className="field">
          <span className="field-label">Description</span>
          <textarea
            className="textarea"
            value={description}
            disabled={readOnly}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Vietnamese iced coffee with condensed milk"
          />
        </label>

        <label className="field">
          <span className="field-label">Category</span>
          <select
            className="select"
            value={categoryId}
            disabled={readOnly}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="section-title">Variations &amp; pricing</div>
        {variations.map((v, idx) => (
          <div className="var-row" key={v.id ?? `new-${idx}`}>
            <input
              className="input vname"
              value={v.name}
              disabled={readOnly}
              placeholder="M"
              onChange={(e) => setVar(idx, { name: e.target.value })}
            />
            <input
              className="input vprice"
              value={v.priceText}
              disabled={readOnly}
              inputMode="decimal"
              placeholder="4.50"
              onChange={(e) => setVar(idx, { priceText: e.target.value })}
            />
            {!readOnly && variations.length > 1 && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => removeVar(idx)}
                aria-label="Remove variation"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button className="btn btn--sm" onClick={addVar}>
            + Add variation
          </button>
        )}

        {!isNew && !readOnly && (
          <>
            <div className="section-title">Visibility</div>
            <div className="settings-row" style={{ padding: 0 }}>
              <span>
                {archived
                  ? "Archived — hidden from the menu"
                  : "Active on the menu"}
              </span>
              <input
                type="checkbox"
                className="switch"
                checked={!archived}
                onChange={(e) => setArchived(!e.target.checked)}
              />
            </div>
          </>
        )}

        {!isNew && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 12 }}>
            Base prices:{" "}
            {item.variations
              .map((v) => `${v.name} ${formatMoney(v.price)}`)
              .join(", ")}
          </p>
        )}

        <div className="sheet-actions">
          <button className="btn" onClick={() => onClose(false)}>
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button
              className="btn btn--primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : isNew ? "Create item" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
