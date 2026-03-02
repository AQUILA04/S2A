import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { credentialsSchema, verifyPassword } from "@/lib/auth/helpers";
import type { MemberRole } from "@/types/database.types";

// ============================================================
// [H1] [M2] Startup validation — fail fast if required secrets are absent.
// Uses a helper function instead of top-level `throw` to avoid TypeScript
// narrowing downstream variables to `never`.
// ============================================================

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `[auth] Missing required environment variable: ${name}. ` +
            (name === "NEXTAUTH_SECRET"
                ? "Generate one with: openssl rand -base64 32"
                : "Set it to the base URL of your application (e.g. http://localhost:3000).")
        );
    }
    return value;
}

const NEXTAUTH_SECRET = requireEnv("NEXTAUTH_SECRET");
requireEnv("NEXTAUTH_URL"); // [M2] Missing NEXTAUTH_URL silently breaks CSRF callbacks

// ============================================================
// NextAuth configuration
// ============================================================

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email",
                    placeholder: "gs@amicale-s2a.org",
                },
                password: {
                    label: "Password",
                    type: "password",
                },
            },

            async authorize(credentials) {
                // 1. Validate input format (schema imported from lib/auth/helpers)
                const parsed = credentialsSchema.safeParse(credentials);
                if (!parsed.success) {
                    throw new Error("Invalid credentials format");
                }

                const { email, password } = parsed.data;

                // 2. Fetch member from Supabase (server-side only)
                const supabase = createServerSupabaseClient();
                const { data: member, error } = await supabase
                    .from("Members")
                    .select("id, email, first_name, last_name, role, status, password_hash")
                    .eq("email", email)
                    .single();

                if (error || !member) {
                    // Generic error to prevent email enumeration
                    throw new Error("Invalid email or password");
                }

                // 3. Check account status
                // [H2] Return the same generic message for INACTIVE accounts —
                // a specific "inactive" response leaks that the email is valid.
                if (member.status === "INACTIVE") {
                    throw new Error("Invalid email or password");
                }

                // 4. Verify password (helper imported from lib/auth/helpers)
                const isPasswordValid = await verifyPassword(password, member.password_hash);
                if (!isPasswordValid) {
                    throw new Error("Invalid email or password");
                }

                // 5. Return user object (encoded into the JWT token)
                return {
                    id: member.id,
                    email: member.email,
                    name: `${member.first_name} ${member.last_name}`,
                    role: member.role,
                };
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours
    },

    callbacks: {
        /**
         * JWT callback: encodes user role into the token on first sign-in.
         */
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { id: string; role: MemberRole }).role;
            }
            return token;
        },

        /**
         * Session callback: exposes id and role from the JWT to the client session.
         * Accessible in Client Components via `useSession()`.
         */
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as MemberRole;
            }
            return session;
        },
    },

    pages: {
        signIn: "/login",
        error: "/login",
    },

    secret: NEXTAUTH_SECRET,

    debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
