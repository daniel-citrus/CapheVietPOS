import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Console primitives. Visual language matched to the Phin POS kiosk: flat
 * surfaces with inset hairline rings (never drop shadows), quick tactile press
 * feedback, warm palette from index.css tokens.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "jade";

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  jade: "btn-jade",
  danger: "btn--danger",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`${variantClass[variant]} btn-sm ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] bg-[var(--color-surface)] shadow-[inset_0_0_0_1px_var(--color-border)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-[var(--color-error)]">
          {error}
        </span>
      )}
    </label>
  );
}

const fieldBase =
  "w-full rounded-[var(--radius)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none shadow-[inset_0_0_0_1px_var(--color-border)] transition-shadow focus:shadow-[inset_0_0_0_2px_var(--color-primary)] disabled:opacity-60";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${fieldBase} ${props.className ?? ""}`} />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber";
}) {
  const tones = {
    neutral:
      "bg-[var(--clay)] text-[var(--color-text-muted)] shadow-[inset_0_0_0_1px_var(--color-border)]",
    green:
      "bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] text-[var(--color-success)]",
    amber:
      "bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[color-mix(in_srgb,var(--color-accent)_70%,var(--color-text))]",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-[var(--color-text-muted)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--color-text)_15%,transparent)] border-t-[var(--color-primary)]" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <Card className="p-10 text-center">
      <p className="font-serif text-lg">{title}</p>
      {body && (
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
          {body}
        </p>
      )}
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm text-[var(--color-error)]">{message}</p>
      {onRetry && (
        <div className="mt-3">
          <Button onClick={onRetry}>Retry</Button>
        </div>
      )}
    </Card>
  );
}
