import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function proxy(req) {
    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
    const isAuthApiRoute = req.nextUrl.pathname.startsWith("/api/auth");
    const isLoggedIn = Boolean(req.nextauth.token);

    if (req.nextUrl.pathname === "/login" && isLoggedIn) {
      return NextResponse.redirect(new URL("/app", req.url));
    }

    if (!isLoggedIn && isApiRoute && !isAuthApiRoute) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 },
      );
    }

    return NextResponse.next();
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
