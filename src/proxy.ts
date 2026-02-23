import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import { CORRELATION_ID_HEADER, getOrCreateCorrelationIdFromHeaders } from "@/lib/correlation-id";

export default withAuth(
  function proxy(req) {
    const correlationId = getOrCreateCorrelationIdFromHeaders(req.headers);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(CORRELATION_ID_HEADER, correlationId);

    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
    const isAuthApiRoute = req.nextUrl.pathname.startsWith("/api/auth");
    const isLoggedIn = Boolean(req.nextauth.token);

    if (req.nextUrl.pathname === "/login" && isLoggedIn) {
      const response = NextResponse.redirect(new URL("/app", req.url));
      response.headers.set(CORRELATION_ID_HEADER, correlationId);
      return response;
    }

    if (!isLoggedIn && isApiRoute && !isAuthApiRoute) {
      const response = NextResponse.json(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 },
      );

      response.headers.set(CORRELATION_ID_HEADER, correlationId);
      return response;
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set(CORRELATION_ID_HEADER, correlationId);
    return response;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;

        if (pathname === "/login") {
          return true;
        }

        if (pathname.startsWith("/api/auth")) {
          return true;
        }

        if (pathname.startsWith("/api/")) {
          return true;
        }

        return Boolean(token);
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
