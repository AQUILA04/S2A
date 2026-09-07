"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { changeForcedPassword } from "./actions";

export default function SetupPasswordPage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const displayName = session?.user?.name?.trim() || "membre";

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        setErrors({});

        const result = await changeForcedPassword({ password, confirmPassword });
        setLoading(false);

        if (result.error) {
            if (result.fieldErrors) {
                setErrors(result.fieldErrors);
                if (result.error !== "Validation failed") {
                    setFormError(result.error);
                }
            } else {
                setFormError(result.error);
            }
            return;
        }

        await update();
        router.push("/dashboard");
        router.refresh();
    }

    return (
        <main className="flex min-h-screen flex-col bg-background">
            <header className="flex h-14 items-center border-b border-border px-4">
                <h1 className="text-base font-semibold text-foreground">
                    Configuration du compte
                </h1>
            </header>

            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary">
                        <Lock className="h-8 w-8" aria-hidden />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                        Bienvenue, {displayName} !
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Pour sécuriser votre compte, choisissez un nouveau mot de passe
                        avant d&apos;accéder à l&apos;application.
                    </p>
                </div>

                {formError && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    >
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="space-y-1.5">
                        <label htmlFor="password" className="block text-sm font-medium">
                            Nouveau mot de passe
                        </label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? "password-error" : undefined}
                            required
                        />
                        {errors.password && (
                            <p id="password-error" role="alert" className="text-xs text-destructive">
                                {errors.password[0]}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium">
                            Confirmer le mot de passe
                        </label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            aria-invalid={!!errors.confirmPassword}
                            aria-describedby={
                                errors.confirmPassword ? "confirm-password-error" : undefined
                            }
                            required
                        />
                        {errors.confirmPassword && (
                            <p
                                id="confirm-password-error"
                                role="alert"
                                className="text-xs text-destructive"
                            >
                                {errors.confirmPassword[0]}
                            </p>
                        )}
                    </div>

                    <PasswordStrengthMeter password={password} />

                    <Button type="submit" disabled={loading} className="h-14 w-full gap-2">
                        {loading ? "Enregistrement..." : "Enregistrer mon mot de passe"}
                        {!loading && <ChevronRight className="h-5 w-5" aria-hidden />}
                    </Button>
                </form>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Besoin d&apos;aide ?{" "}
                    <a
                        href="mailto:support@amicale-s2a.org"
                        className="font-semibold text-primary hover:underline"
                    >
                        Contacter le support
                    </a>
                </p>
            </div>
        </main>
    );
}
