export const CORRELATION_ID_HEADER = "x-correlation-id";

const VALID_CORRELATION_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const MAX_CORRELATION_ID_LENGTH = 128;

export function normalizeCorrelationId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_CORRELATION_ID_LENGTH ||
    !VALID_CORRELATION_ID_PATTERN.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function getOrCreateCorrelationIdFromHeaders(headers: Pick<Headers, "get">) {
  return normalizeCorrelationId(headers.get(CORRELATION_ID_HEADER)) ?? createCorrelationId();
}

export function withCorrelationIdHeader(init: ResponseInit | undefined, correlationId: string) {
  const headers = new Headers(init?.headers);
  headers.set(CORRELATION_ID_HEADER, correlationId);
  return {
    ...init,
    headers,
  };
}
