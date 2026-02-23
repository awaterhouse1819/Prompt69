import { NextResponse } from "next/server";

import { withCorrelationIdHeader } from "@/lib/correlation-id";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

type ApiResponseInit = ResponseInit & {
  correlationId?: string | null;
};

function applyCorrelationHeader(init?: ApiResponseInit) {
  if (!init) {
    return undefined;
  }

  const { correlationId, ...rest } = init;

  if (!correlationId) {
    return rest;
  }

  return withCorrelationIdHeader(rest, correlationId);
}

export function apiOk<T>(data: T, init?: ApiResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, applyCorrelationHeader(init));
}

export function apiError(code: string, message: string, status = 400, init?: ApiResponseInit) {
  const responseInit = applyCorrelationHeader({
    ...init,
    status,
  });

  return NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error: { code, message },
    },
    responseInit,
  );
}
