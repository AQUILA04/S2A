"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import {
    completeActivationWithPassword,
    resendActivationOtp,
    verifyActivationOtpOnly,
} from "./actions";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ActivatePage() {
    const router = useRouter();
    const [step, setStep] = useState<"otp" | "password">("otp");
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

    async function handleOtpSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        setSuccessMessage(null);
        setErrors({});

        const result = await verifyActivationOtpOnly({ phone, code });
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

        setSuccessMessage("Code vérifié. Choisissez maintenant votre mot de passe.");
        setStep("password");
    }

    async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        setSuccessMessage(null);
        setErrors({});

        const result = await completeActivationWithPassword({
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
                if (result.error.includes("expirée")) {
                    setStep("otp");
                }
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
                        {step === "otp"
                            ? "Étape 1 sur 2 — Vérifiez le code reçu par SMS."
                            : "Étape 2 sur 2 — Choisissez votre mot de passe."}
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

                    {step === "otp" ? (
                        <form onSubmit={handleOtpSubmit} className="space-y-4" noValidate>
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
                                    aria-invalid={!!errors.phone}
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
                                    aria-invalid={!!errors.code}
                                    required
                                />
                                {errors.code && (
                                    <p className="text-xs text-destructive">{errors.code[0]}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={resendCooldown > 0 || !phone.trim()}
                                    className="min-h-11 text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                    {resendCooldown > 0
                                        ? `Renvoyer le code (${resendCooldown}s)`
                                        : "Renvoyer le code"}
                                </button>
                            </div>

                            <Button type="submit" disabled={loading} className="h-12 w-full">
                                {loading ? "Vérification..." : "Vérifier le code"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
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
                                    required
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive">{errors.password[0]}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium"
                                >
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
                                    required
                                />
                                {errors.confirmPassword && (
                                    <p className="text-xs text-destructive">
                                        {errors.confirmPassword[0]}
                                    </p>
                                )}
                            </div>

                            <PasswordStrengthMeter password={password} />

                            <Button type="submit" disabled={loading} className="h-12 w-full">
                                {loading ? "Activation en cours..." : "Activer mon compte"}
                            </Button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep("otp");
                                    setFormError(null);
                                    setSuccessMessage(null);
                                }}
                                className="min-h-11 w-full text-sm text-muted-foreground hover:text-foreground"
                            >
                                Retour à la vérification SMS
                            </button>
                        </form>
                    )}

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Déjà activé ?{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Se connecter
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
