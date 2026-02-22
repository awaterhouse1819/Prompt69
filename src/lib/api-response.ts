import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, init);
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json<ApiResponse<null>>(
    {
      data: null,
      error: { code, message },
    },
    { status },
  );
}
