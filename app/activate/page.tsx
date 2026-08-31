"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { activateAccount, resendActivationOtp } from "./actions";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ActivatePage() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    function startResendCooldown() {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        const interval = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    async function handleResend() {
        setFormError(null);
        setSuccessMessage(null);
        setErrors({});

        const result = await resendActivationOtp({ phone });
        if (result.error) {
            setFormError(result.error);
            if (result.fieldErrors) setErrors(result.fieldErrors);
            return;
        }

        setSuccessMessage("Un nouveau code a été envoyé à votre numéro.");
        startResendCooldown();
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        setSuccessMessage(null);
        setErrors({});

        const result = await activateAccount({
            phone,
            code,
            password,
            confirmPassword,
        });

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

        router.push("/login?activated=1");
        router.refresh();
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
            <Card className="w-full max-w-md rounded-2xl shadow-md p-2">
                <CardHeader className="text-center pb-4">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary mb-2">
                        Amicale
                    </span>
                    <CardTitle className="text-2xl font-bold text-foreground">
                        Activer votre compte
                    </CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Saisissez le code reçu par SMS, puis choisissez votre mot de passe.
                    </p>
                </CardHeader>

                <CardContent>
                    {formError && (
                        <div
                            role="alert"
                            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                        >
                            {formError}
                        </div>
                    )}

                    {successMessage && (
                        <div
                            role="status"
                            className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
                        >
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        <div className="space-y-1.5">
                            <label htmlFor="phone" className="block text-sm font-medium">
                                Numéro de téléphone
                            </label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="+22890123456"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                            {errors.phone && (
                                <p className="text-xs text-destructive">{errors.phone[0]}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="code" className="block text-sm font-medium">
                                Code de vérification
                            </label>
                            <Input
                                id="code"
                                name="code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                            {errors.code && (
                                <p className="text-xs text-destructive">{errors.code[0]}</p>
                            )}
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || !phone.trim()}
                                className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                                {resendCooldown > 0
                                    ? `Renvoyer le code (${resendCooldown}s)`
                                    : "Renvoyer le code"}
                            </button>
                        </div>

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
                                required
                            />
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password[0]}</p>
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
                                required
                            />
                            {errors.confirmPassword && (
                                <p className="text-xs text-destructive">
                                    {errors.confirmPassword[0]}
                                </p>
                            )}
                        </div>

                        <Button type="submit" disabled={loading} className="w-full h-12">
                            {loading ? "Activation en cours..." : "Activer mon compte"}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Déjà activé ?{" "}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            Se connecter
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
