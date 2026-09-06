/// <reference types="vite/client" />

// The frontend has no environment configuration of its own — it only talks to
// `/api/*`. All config (DATA_SOURCE, the Square token, the Anthropic key) is
// read server-side by the backend; the client learns what it needs from
// `GET /api/meta`.
