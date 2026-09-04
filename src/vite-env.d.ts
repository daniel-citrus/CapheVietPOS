/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_AGENT_MODEL?: string;
  // SQUARE_ACCESS_TOKEN and ANTHROPIC_API_KEY are deliberately NOT declared
  // here — they are read only by vite.config.ts (Node, server-side) and must
  // never be VITE_-prefixed or referenced from client code.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
