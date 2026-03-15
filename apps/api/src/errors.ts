export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

type ErrorCandidate = {
  code?: unknown;
  message?: unknown;
  statusCode?: unknown;
  status?: unknown;
  cause?: unknown;
  errors?: unknown;
};

const collectErrorCandidates = (value: unknown): ErrorCandidate[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  const queue: ErrorCandidate[] = [value as ErrorCandidate];
  const collected: ErrorCandidate[] = [];
  const seen = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }

    if (seen.has(current)) {
      continue;
    }

    seen.add(current);
    collected.push(current);

    if (current.cause && typeof current.cause === "object") {
      queue.push(current.cause as ErrorCandidate);
    }

    if (Array.isArray(current.errors)) {
      for (const nested of current.errors) {
        if (nested && typeof nested === "object") {
          queue.push(nested as ErrorCandidate);
        }
      }
    }
  }

  return collected;
};

const getStatusFromCandidates = (candidates: ErrorCandidate[]): number | null => {
  for (const candidate of candidates) {
    const statusCode = typeof candidate.statusCode === "number" ? candidate.statusCode : null;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return statusCode;
    }

    const status = typeof candidate.status === "number" ? candidate.status : null;
    if (status && status >= 400 && status < 500) {
      return status;
    }
  }

  return null;
};

const getFirstCode = (candidates: ErrorCandidate[]): string | null => {
  for (const candidate of candidates) {
    if (typeof candidate.code === "string" && candidate.code.trim().length > 0) {
      return candidate.code;
    }
  }

  return null;
};

const getFirstMessage = (candidates: ErrorCandidate[]): string | null => {
  for (const candidate of candidates) {
    if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
      return candidate.message;
    }
  }

  return null;
};

const mapFastifyCodeToError = (code: string, fallbackMessage: string): AppError | null => {
  if (code === "FST_ERR_CTP_EMPTY_JSON_BODY") {
    return new AppError(400, code, fallbackMessage);
  }

  if (code.startsWith("FST_ERR_CTP_")) {
    return new AppError(400, code, fallbackMessage);
  }

  if (code === "FST_ERR_VALIDATION") {
    return new AppError(400, code, fallbackMessage);
  }

  return null;
};

const mapPostgresCodeToError = (code: string): AppError | null => {
  if (code === "23505") {
    return new AppError(409, "CONFLICT", "Resource already exists or conflicts with an existing record.");
  }

  if (code === "23503") {
    return new AppError(409, "RELATION_CONFLICT", "Referenced resource is invalid or in use.");
  }

  if (code === "23502" || code === "22P02" || code === "22001" || code === "23514") {
    return new AppError(400, "VALIDATION_ERROR", "Invalid request payload.");
  }

  return null;
};

export const toClientAppError = (error: unknown): AppError | null => {
  const candidates = collectErrorCandidates(error);

  const statusCode = getStatusFromCandidates(candidates);
  const code = getFirstCode(candidates);
  const message = getFirstMessage(candidates) ?? "Invalid request.";

  if (code) {
    const fastifyMapped = mapFastifyCodeToError(code, message);
    if (fastifyMapped) {
      return fastifyMapped;
    }

    const postgresMapped = mapPostgresCodeToError(code);
    if (postgresMapped) {
      return postgresMapped;
    }
  }

  if (statusCode !== null) {
    return new AppError(statusCode, code ?? "BAD_REQUEST", message);
  }

  return null;
};
