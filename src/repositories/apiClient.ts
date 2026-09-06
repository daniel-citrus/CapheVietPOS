import type { ApiErrorBody, RoleHeader } from "shared/api";
import { errorFromWire, RepositoryError } from "shared/errors";

/**
 * The one place the frontend talks to the backend. Attaches the stubbed
 * `X-Role` header (kept current by AuthContext) and turns a `{ error }`
 * response body back into the typed `RepositoryError` family so components
 * catch failures exactly as they did against the old in-browser repos.
 */

const BASE = "/api";

let roleHeader: RoleHeader = "admin";

/** Called by AuthProvider whenever the "View as" role changes. */
export function setRoleHeader(role: RoleHeader): void {
  roleHeader = role;
}

export function currentRoleHeader(): RoleHeader {
  return roleHeader;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Role": roleHeader,
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new RepositoryError("Could not reach the server.", { cause });
  }

  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => null)) as
    | (T & Partial<ApiErrorBody>)
    | null;

  if (!res.ok) {
    const err = body?.error;
    throw errorFromWire(
      err?.code ?? "repository",
      err?.message ?? `Request failed (${res.status})`,
    );
  }
  return body as T;
}
