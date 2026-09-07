"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { changePassword } from "./actions";

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [visibleFields, setVisibleFields] = useState<Set<PasswordField>>(new Set());
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function toggleVisibility(field: PasswordField) {
        setVisibleFields((current) => {
            const next = new Set(current);
            if (next.has(field)) next.delete(field);
            else next.add(field);
            return next;
        });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setErrors({});
        setFormError(null);
        setSuccessMessage(null);

        const result = await changePassword({
            currentPassword,
            newPassword,
            confirmPassword,
        });

        setLoading(false);

        if (result.error) {
            setErrors(result.fieldErrors ?? {});
            if (result.error !== "Validation failed") setFormError(result.error);
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage("Votre mot de passe a été modifié avec succès.");
    }

    const fields = [
        {
            id: "currentPassword" as const,
            label: "Mot de passe actuel",
            value: currentPassword,
            setValue: setCurrentPassword,
            autoComplete: "current-password",
        },
        {
            id: "newPassword" as const,
            label: "Nouveau mot de passe",
            value: newPassword,
            setValue: setNewPassword,
            autoComplete: "new-password",
        },
        {
            id: "confirmPassword" as const,
            label: "Confirmer le nouveau mot de passe",
            value: confirmPassword,
            setValue: setConfirmPassword,
            autoComplete: "new-password",
        },
    ];

    return (
        <div className="mx-auto w-full max-w-lg px-4 py-8">
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-primary">
                        <KeyRound className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Changer mon mot de passe
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Confirmez votre mot de passe actuel, puis choisissez-en un nouveau.
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

                {successMessage && (
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
                    >
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {fields.map((field) => {
                        const isVisible = visibleFields.has(field.id);
                        const errorId = `${field.id}-error`;

                        return (
                            <div key={field.id} className="space-y-1.5">
                                <label htmlFor={field.id} className="block text-sm font-medium">
                                    {field.label}
                                </label>
                                <div className="relative">
                                    <Input
                                        id={field.id}
                                        name={field.id}
                                        type={isVisible ? "text" : "password"}
                                        autoComplete={field.autoComplete}
                                        value={field.value}
                                        onChange={(event) => field.setValue(event.target.value)}
                                        className="h-11 pr-12"
                                        aria-invalid={!!errors[field.id]}
                                        aria-describedby={errors[field.id] ? errorId : undefined}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleVisibility(field.id)}
                                        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                                        aria-label={
                                            isVisible
                                                ? `Masquer ${field.label.toLowerCase()}`
                                                : `Afficher ${field.label.toLowerCase()}`
                                        }
                                    >
                                        {isVisible ? (
                                            <EyeOff className="h-5 w-5" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-5 w-5" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                                {errors[field.id] && (
                                    <p id={errorId} role="alert" className="text-xs text-destructive">
                                        {errors[field.id][0]}
                                    </p>
                                )}
                            </div>
                        );
                    })}

                    <PasswordStrengthMeter password={newPassword} />

                    <Button type="submit" disabled={loading} className="h-14 w-full gap-2">
                        {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                        {loading ? "Modification..." : "Modifier mon mot de passe"}
                    </Button>
                </form>
            </section>
        </div>
    );
}
