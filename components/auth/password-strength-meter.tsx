"use client";

import { cn } from "@/lib/utils";
import {
    passwordStrengthLabel,
    scorePasswordStrength,
} from "@/lib/auth/password-strength";

type PasswordStrengthMeterProps = {
    password: string;
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const score = scorePasswordStrength(password);
    const { label, tone } = passwordStrengthLabel(score);

    return (
        <div className="space-y-1.5" aria-live="polite">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Force du mot de passe</span>
                <span
                    className={cn(
                        "font-semibold",
                        tone === "destructive" && "text-destructive",
                        tone === "primary" && "text-primary",
                        tone === "success" && "text-success"
                    )}
                >
                    {password ? `${label} (${score}%)` : "—"}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
                <div
                    className={cn(
                        "h-full rounded-full transition-all",
                        tone === "destructive" && "bg-destructive",
                        tone === "primary" && "bg-primary",
                        tone === "success" && "bg-success"
                    )}
                    style={{ width: `${score}%` }}
                />
            </div>
            <p className="text-sm text-muted-foreground">
                Au moins 8 caractères, idéalement majuscules, chiffres et symbole.
            </p>
        </div>
    );
}
