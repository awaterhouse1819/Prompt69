import { ZodError } from "zod";

import { apiError } from "@/lib/api-response";
import { CORRELATION_ID_HEADER, getOrCreateCorrelationIdFromHeaders } from "@/lib/correlation-id";
import { logger } from "@/lib/logger";

type HandlerContext = {
  correlationId: string;
};

type RouteMetadata = {
  route: string;
  method: string;
};

type ApiRouteErrorShape = {
  code: string;
  message: string;
  status: number;
};

export class ApiRouteError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function mapApiError(error: unknown): ApiRouteErrorShape {
  if (error instanceof ApiRouteError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof ZodError) {
    return {
      code: "INVALID_INPUT",
      message: "Invalid request payload",
      status: 400,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    status: 500,
  };
}

export async function withApiHandler(
  request: Request,
  handler: (context: HandlerContext) => Promise<Response>,
  metadata: RouteMetadata,
) {
  const correlationId = getOrCreateCorrelationIdFromHeaders(request.headers);

  try {
    const response = await handler({ correlationId });

    if (!response.headers.has(CORRELATION_ID_HEADER)) {
      response.headers.set(CORRELATION_ID_HEADER, correlationId);
    }

    return response;
  } catch (error) {
    const mapped = mapApiError(error);

    logger.error("Unhandled API route error", {
      correlationId,
      route: metadata.route,
      method: metadata.method,
      code: mapped.code,
      status: mapped.status,
      error,
    });

    return apiError(mapped.code, mapped.message, mapped.status, { correlationId });
  }
}
