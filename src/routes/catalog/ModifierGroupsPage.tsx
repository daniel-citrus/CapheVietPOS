import { formatMoney } from "../../domain";
import { useRepositories } from "../../repositories/RepositoryContext";
import { useAsync } from "../../lib/useAsync";
import {
  Badge,
  Card,
  ErrorState,
  PageHeader,
  Spinner,
} from "../../components/ui";
import { t } from "../../i18n/copy";
import type { ModifierGroup } from "../../domain";

function ruleLabel(g: ModifierGroup): string {
  if (g.maxSelect <= 1) return t("modifierGroups.rule.single");
  return t("modifierGroups.rule.multi", { max: g.maxSelect });
}

export function ModifierGroupsPage() {
  const { catalog } = useRepositories();
  const { data, loading, error, reload } = useAsync(
    () => catalog.listModifierGroups(),
    [],
  );

  return (
    <div>
      <PageHeader
        title={t("modifierGroups.title")}
        subtitle={t("modifierGroups.subtitle")}
      />

      {loading && <Spinner label={t("common.loading")} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {!loading && !error && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">{t("modifierGroups.col.name")}</th>
                <th className="px-4 py-2 font-medium">{t("modifierGroups.col.rule")}</th>
                <th className="px-4 py-2 font-medium">{t("modifierGroups.col.options")}</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((g) => (
                <tr key={g.id} className="border-b border-[var(--border)] last:border-0 align-top">
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge>{ruleLabel(g)}</Badge>
                      {g.required ? (
                        <Badge tone="green">{t("modifierGroups.rule.required")}</Badge>
                      ) : (
                        <Badge>{t("modifierGroups.rule.optional")}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {g.options
                      .map((o) =>
                        o.priceDelta.amount > 0
                          ? `${o.name} (+${formatMoney(o.priceDelta)})`
                          : o.name,
                      )
                      .join(", ")}
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
