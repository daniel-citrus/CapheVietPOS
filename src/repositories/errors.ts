/**
 * Repository errors are modeled as rejected promises. The mock and the future
 * HttpRepository both throw these so callers handle failure identically.
 */
export class RepositoryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class PermissionError extends RepositoryError {
  constructor(action: string) {
    super(`Not permitted: ${action}`);
    this.name = "PermissionError";
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
