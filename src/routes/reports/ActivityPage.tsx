import { useState } from "react";
import type { AuditEntry } from "shared/api";
import { apiFetch } from "../../api/client";
import { useMenuRevision } from "../../api/menuRevision";
import { useAsync } from "../../lib/useAsync";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from "../../components/ui";
import { t } from "../../i18n/copy";

function when(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function Row({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.before !== undefined || entry.after !== undefined;

  return (
    <>
      <tr
        className={`border-b border-[var(--border)] ${
          hasDetail ? "cursor-pointer hover:bg-[var(--bg)]" : ""
        } ${open ? "" : "last:border-0"}`}
        onClick={hasDetail ? () => setOpen((v) => !v) : undefined}
      >
        <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">
          {when(entry.at)}
        </td>
        <td className="px-4 py-2.5">
          <Badge tone={entry.actorRole === "admin" ? "green" : "neutral"}>
            {entry.actorRole}
          </Badge>
        </td>
        <td className="px-4 py-2.5">{entry.summary}</td>
        <td className="px-4 py-2.5 text-right text-xs text-[var(--muted)]">
          {hasDetail ? (open ? "hide" : "detail") : ""}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-[var(--border)] last:border-0">
          <td colSpan={4} className="px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label={t("activity.before")} value={entry.before} />
              <Detail label={t("activity.after")} value={entry.after} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  if (value === undefined) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <pre className="max-h-64 overflow-auto rounded-[var(--radius)] bg-[var(--clay)] p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function ActivityPage() {
  const revision = useMenuRevision();
  const { data, loading, error, reload } = useAsync(
    () => apiFetch<AuditEntry[]>("/audit?limit=200"),
    [revision],
  );

  return (
    <div>
      <PageHeader title={t("activity.title")} subtitle={t("activity.subtitle")} />

      {loading && <Spinner label={t("common.loading")} />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!loading && !error && (data ?? []).length === 0 && (
        <EmptyState
          title={t("activity.empty.title")}
          body={t("activity.empty.body")}
        />
      )}

      {!loading && !error && (data ?? []).length > 0 && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">{t("activity.col.when")}</th>
                <th className="px-4 py-2 font-medium">{t("activity.col.who")}</th>
                <th className="px-4 py-2 font-medium">{t("activity.col.what")}</th>
                <th className="px-4 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
