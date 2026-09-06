import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Meta } from "shared/api";
import { apiFetch } from "../api/client";

/**
 * `GET /api/meta`, fetched once. Tells the UI which menu source is live
 * (for the badge and the image-edit gate) and whether the agent has an
 * Anthropic key (for the chat intro copy). The chat works either way.
 */
type MetaValue = Meta & { loading: boolean };

const DEFAULT: MetaValue = {
  dataSource: "mock",
  agentAvailable: false,
  loading: true,
};

const MetaContext = createContext<MetaValue>(DEFAULT);

export function MetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<MetaValue>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Meta>("/meta")
      .then((m) => {
        if (!cancelled) setMeta({ ...m, loading: false });
      })
      .catch(() => {
        if (!cancelled) setMeta((prev) => ({ ...prev, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export function useMeta(): MetaValue {
  return useContext(MetaContext);
}
