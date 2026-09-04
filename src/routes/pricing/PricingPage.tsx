import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { formatMoney, parseMoney } from "../../domain";
import type { Item } from "../../domain";
import { useAuth } from "../../auth/AuthContext";
import { useRepositories } from "../../repositories/RepositoryContext";
import { useAsync } from "../../lib/useAsync";
import {
  Button,
  Card,
  ErrorState,
  PageHeader,
  Spinner,
  TextInput,
} from "../../components/ui";
import { t } from "../../i18n/copy";

export function PricingPage() {
  const { catalog } = useRepositories();
  const { can } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => catalog.listItems({ includeArchived: false }),
    [],
  );

  const rows = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((item) =>
          item.variations.map((v) => ({ item, variation: v })),
        ),
    [data],
  );

  if (!can("pricing.read")) return <Navigate to="/items" replace />;
  const writable = can("pricing.write");

  return (
    <div className="max-w-3xl">
      <PageHeader title={t("pricing.title")} subtitle={t("pricing.subtitle")} />

      {loading && <Spinner label={t("common.loading")} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">{t("pricing.col.item")}</th>
                <th className="px-4 py-2 font-medium">{t("pricing.col.variation")}</th>
                <th className="px-4 py-2 font-medium">{t("pricing.col.price")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, variation }) => (
                <PriceRow
                  key={variation.id}
                  item={item}
                  variationId={variation.id}
                  variationName={variation.name}
                  price={variation.price}
                  writable={writable}
                  onSaved={reload}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function PriceRow({
  item,
  variationId,
  variationName,
  price,
  writable,
  onSaved,
}: {
  item: Item;
  variationId: string;
  variationName: string;
  price: { amount: number; currency: string };
  writable: boolean;
  onSaved: () => void;
}) {
  const { catalog } = useRepositories();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((price.amount / 100).toFixed(2));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = parseMoney(value, price.currency);
    if (!parsed) {
      setError(t("pricing.invalid"));
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await catalog.setVariationPrice(item.id, variationId, parsed);
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-[var(--border)] last:border-0">
      <td className="px-4 py-2.5">{item.name}</td>
      <td className="px-4 py-2.5 text-[var(--muted)]">{variationName}</td>
      <td className="px-4 py-2.5">
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="w-24">
              <TextInput
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <Button variant="primary" disabled={saving} onClick={save}>
              {t("common.save")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span>{formatMoney(price)}</span>
            {writable && (
              <Button
                variant="ghost"
                onClick={() => {
                  setValue((price.amount / 100).toFixed(2));
                  setEditing(true);
                }}
              >
                {t("common.edit")}
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
