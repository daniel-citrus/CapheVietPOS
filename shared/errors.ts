/**
 * Repository errors, shared by the server (which throws them) and the client
 * (whose `apiClient` reconstructs them from the JSON error body). Both surfaces
 * handle failure identically: catch, show `.message`.
 */

/** Wire discriminator carried in `{ error: { code, message } }` responses. */
export type ErrorCode = "validation" | "not_found" | "permission" | "repository";

const STATUS: Record<ErrorCode, number> = {
  validation: 400,
  not_found: 404,
  permission: 403,
  repository: 502,
};

export class RepositoryError extends Error {
  readonly code: ErrorCode;
  /** HTTP status the server should send / the client saw. */
  readonly status: number;

  constructor(
    message: string,
    options?: { cause?: unknown; code?: ErrorCode },
  ) {
    super(message, options);
    this.name = "RepositoryError";
    this.code = options?.code ?? "repository";
    this.status = STATUS[this.code];
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, { code: "not_found" });
    this.name = "NotFoundError";
  }
}

export class PermissionError extends RepositoryError {
  constructor(action: string) {
    super(`Not permitted: ${action}`, { code: "permission" });
    this.name = "PermissionError";
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string) {
    super(message, { code: "validation" });
    this.name = "ValidationError";
  }
}

/** Rebuild the right error subclass from a wire `{ code, message }`. */
export function errorFromWire(code: string, message: string): RepositoryError {
  switch (code) {
    case "validation":
      return new ValidationError(message);
    case "permission":
      return new PermissionError(message);
    case "not_found": {
      const err = new RepositoryError(message, { code: "not_found" });
      err.name = "NotFoundError";
      return err;
    }
    default:
      return new RepositoryError(message);
  }
}
