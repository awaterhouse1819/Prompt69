import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { env } from "@/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SINGLE_USER_ID = "00000000-0000-0000-0000-000000000001";
const IS_PRODUCTION = env.NODE_ENV === "production";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const SESSION_UPDATE_AGE_SECONDS = 60 * 60;

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  useSecureCookies: IS_PRODUCTION,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  cookies: {
    sessionToken: {
      name: IS_PRODUCTION ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: IS_PRODUCTION,
      },
    },
    callbackUrl: {
      name: IS_PRODUCTION ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: IS_PRODUCTION,
      },
    },
    csrfToken: {
      name: IS_PRODUCTION ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: IS_PRODUCTION,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        if (email !== env.AUTH_ADMIN_EMAIL || password !== env.AUTH_ADMIN_PASSWORD) {
          return null;
        }

        return {
          id: SINGLE_USER_ID,
          email: env.AUTH_ADMIN_EMAIL,
          name: "PromptRefine Admin",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
};
