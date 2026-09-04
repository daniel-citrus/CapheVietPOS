import { useEffect, useState } from "react";
import { anthropicStatusUrl } from "./env";

export type AgentAvailability = "checking" | "available" | "unavailable";

/**
 * Whether the server has ANTHROPIC_API_KEY configured — resolved by asking
 * /api/anthropic-status (a boolean, never the key itself). Cached at module
 * scope so every caller shares one network round trip.
 */
let cached: Promise<boolean> | null = null;

function fetchAvailability(): Promise<boolean> {
  if (!cached) {
    cached = fetch(anthropicStatusUrl)
      .then((res) => (res.ok ? res.json() : { configured: false }))
      .then((body: { configured?: boolean }) => Boolean(body.configured))
      .catch(() => false);
  }
  return cached;
}

export function useAnthropicAvailability(): AgentAvailability {
  const [status, setStatus] = useState<AgentAvailability>("checking");

  useEffect(() => {
    let cancelled = false;
    fetchAvailability().then((ok) => {
      if (!cancelled) setStatus(ok ? "available" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
