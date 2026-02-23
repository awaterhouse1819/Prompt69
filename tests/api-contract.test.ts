import { describe, expect, it } from "vitest";

import { apiError, apiOk } from "@/lib/api-response";
import { ApiRouteError, withApiHandler } from "@/lib/api-route";
import { CORRELATION_ID_HEADER } from "@/lib/correlation-id";

describe("API contract responses", () => {
  it("apiOk returns { data, error: null }", async () => {
    const response = apiOk({ ok: true });
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload).toEqual({
      data: { ok: true },
      error: null,
    });
  });

  it("apiError returns { data: null, error }", async () => {
    const response = apiError("INVALID_INPUT", "Bad input", 400);
    expect(response.status).toBe(400);

    const payload = await response.json();
    expect(payload).toEqual({
      data: null,
      error: {
        code: "INVALID_INPUT",
        message: "Bad input",
      },
    });
  });

  it("withApiHandler maps unhandled errors to INTERNAL_ERROR contract", async () => {
    const response = await withApiHandler(
      new Request("http://localhost/api/test", {
        headers: {
          [CORRELATION_ID_HEADER]: "test-correlation-id",
        },
      }),
      async () => {
        throw new Error("unexpected");
      },
      {
        route: "/api/test",
        method: "GET",
      },
    );

    expect(response.status).toBe(500);
    expect(response.headers.get(CORRELATION_ID_HEADER)).toBe("test-correlation-id");

    const payload = await response.json();
    expect(payload).toEqual({
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });

  it("withApiHandler maps ApiRouteError to its status and code", async () => {
    const response = await withApiHandler(
      new Request("http://localhost/api/test"),
      async () => {
        throw new ApiRouteError("NOT_FOUND", "Missing resource", 404);
      },
      {
        route: "/api/test",
        method: "GET",
      },
    );

    expect(response.status).toBe(404);

    const payload = await response.json();
    expect(payload).toEqual({
      data: null,
      error: {
        code: "NOT_FOUND",
        message: "Missing resource",
      },
    });
  });
});
