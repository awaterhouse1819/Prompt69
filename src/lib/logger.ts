type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credential/i,
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return CIRCULAR;
    }

    seen.add(value);
    const redactedEntries = Object.entries(value).map(([key, nestedValue]) => {
      if (isSensitiveKey(key)) {
        return [key, REDACTED] as const;
      }

      return [key, redactValue(nestedValue, seen)] as const;
    });
    return Object.fromEntries(redactedEntries);
  }

  return value;
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: redactValue(context, new WeakSet<object>()) } : {}),
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    write("debug", message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    write("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    write("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    write("error", message, context);
  },
};
