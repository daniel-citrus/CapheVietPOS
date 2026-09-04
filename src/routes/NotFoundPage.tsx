import { Link } from "react-router-dom";
import { Button, EmptyState } from "../components/ui";
import { t } from "../i18n/copy";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md">
      <EmptyState title={t("notFound.title")} />
      <div className="mt-4 text-center">
        <Link to="/items">
          <Button variant="primary">{t("nav.items")}</Button>
        </Link>
      </div>
    </div>
  );
}
