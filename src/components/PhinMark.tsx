/** The Vietnamese phin (drip filter) mark, matched to the Phin POS kiosk. */
export function PhinMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="15" y="6" width="18" height="16" rx="1.2" />
      <path d="M15 14h18" />
      <path d="M18 22v3h12v-3" />
      <path d="M12 28h24v6a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8v-6z" />
      <path d="M24 22v6" />
    </svg>
  );
}
