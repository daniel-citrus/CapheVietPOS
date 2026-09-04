import { EmptyState, PageHeader } from "../../components/ui";
import { t } from "../../i18n/copy";

/**
 * P1 scaffold. Navigable route, honest empty state, no fake charts or data.
 * Real content arrives in P2 once the Square backend is connected.
 */
export function ScaffoldPage({ titleKey }: { titleKey: Parameters<typeof t>[0] }) {
  return (
    <div>
      <PageHeader title={t(titleKey)} />
      <EmptyState
        title={t("scaffold.noData.title")}
        body={t("scaffold.noData.body")}
      />
    </div>
  );
}
