"use client";

import { signIn, getSession } from "next-auth/react";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// ============================================================
// Map NextAuth internal error codes to French user-friendly messages.
// Generic phrasing prevents leaking whether an account exists.
// ============================================================
const AUTH_ERROR_MESSAGES: Record<string, string> = {
    CredentialsSignin: "Identifiants incorrects. Veuillez réessayer.",
    SessionRequired: "Vous devez être connecté pour accéder à cette page.",
    Default: "Une erreur est survenue. Veuillez réessayer.",
};

function getErrorMessage(error: string): string {
    return AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default;
}

import { Suspense } from "react";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-muted/30">Chargement...</div>}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(() => {
        // Handle error from NextAuth redirect (e.g., after server-side block)
        const urlError = searchParams.get("error");
        return urlError ? getErrorMessage(urlError) : null;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const isCallbackLogin = searchParams.get("callbackUrl") === "/dashboard";
        if (!isCallbackLogin) return;
        // #region agent log
        getSession()
            .then((session) => {
                const callbackCookies =
                    typeof document !== "undefined"
                        ? document.cookie
                              .split(";")
                              .map((part) => part.trim().split("=")[0])
                              .filter((name) => name.includes("next-auth"))
                        : [];
                fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        runId: "pre-fix",
                        hypothesisId: "H8",
                        location: "app/login/page.tsx:useEffect:getSessionOnCallbackLogin",
                        message: "Session check while on login callbackUrl dashboard",
                        data: {
                            hasSession: Boolean(session),
                            sessionUserEmail: session?.user?.email ?? null,
                            sessionUserId: session?.user?.id ?? null,
                            nextAuthCookies: callbackCookies,
                        },
                        timestamp: Date.now(),
                    }),
                }).catch(() => {});
            })
            .catch(() => {});
        // #endregion
    }, [searchParams]);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        // #region agent log
        fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                runId: "pre-fix",
                hypothesisId: "H1",
                location: "app/login/page.tsx:handleSubmit:start",
                message: "Login submit started",
                data: {
                    hasEmail: Boolean(email),
                    emailLength: email?.length ?? 0,
                    hasPassword: Boolean(password),
                    callbackUrlParam: searchParams.get("callbackUrl"),
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        // #region agent log
        fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                runId: "pre-fix",
                hypothesisId: "H2",
                location: "app/login/page.tsx:handleSubmit:signInResult",
                message: "SignIn completed",
                data: {
                    ok: result?.ok ?? null,
                    error: result?.error ?? null,
                    status: result?.status ?? null,
                    url: result?.url ?? null,
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion

        setLoading(false);
        const sessionAfterSignIn = await getSession();
        const cookiesAfterSignIn =
            typeof document !== "undefined"
                ? document.cookie
                      .split(";")
                      .map((part) => part.trim().split("=")[0])
                      .filter((name) => name.includes("next-auth"))
                : [];
        // #region agent log
        fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                runId: "pre-fix",
                hypothesisId: "H6",
                location: "app/login/page.tsx:handleSubmit:getSessionAfterSignIn",
                message: "Session state right after signIn",
                data: {
                    hasSession: Boolean(sessionAfterSignIn),
                    sessionUserEmail: sessionAfterSignIn?.user?.email ?? null,
                    sessionUserId: sessionAfterSignIn?.user?.id ?? null,
                    sessionUserRole: sessionAfterSignIn?.user?.role ?? null,
                    nextAuthCookies: cookiesAfterSignIn,
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion

        if (result?.error) {
            // Map internal error code to a French user-friendly message
            setError(getErrorMessage(result.error));
        } else {
            // Redirect to callbackUrl if provided (e.g., from middleware), else dashboard
            let callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
            // Prevent open redirect by ensuring it's a valid relative path
            if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
                callbackUrl = "/dashboard";
            }
            // #region agent log
            fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    runId: "pre-fix",
                    hypothesisId: "H3",
                    location: "app/login/page.tsx:handleSubmit:redirect",
                    message: "Client redirecting after successful signIn",
                    data: {
                        callbackUrl,
                    },
                    timestamp: Date.now(),
                }),
            }).catch(() => {});
            // #endregion
            router.push(callbackUrl);
            router.refresh();
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
            <Card className="w-full max-w-sm rounded-2xl shadow-md p-2">
                {/* Logo + Title */}
                <CardHeader className="text-center pb-6">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-4">
                        Amicale
                    </span>
                    <CardTitle className="text-2xl font-bold text-foreground">S2A</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Connexion à votre espace de gestion
                    </p>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* Error message — uses role="alert" for screen reader accessibility */}
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            >
                                {error}
                            </div>
                        )}

                        {/* Email field */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground"
                            >
                                Adresse email
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                aria-required="true"
                                placeholder="gs@amicale-s2a.org"
                            />
                        </div>

                        {/* Password field */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-foreground"
                            >
                                Mot de passe
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                aria-required="true"
                            />
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12"
                        >
                            {loading ? "Connexion en cours..." : "Se connecter"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
