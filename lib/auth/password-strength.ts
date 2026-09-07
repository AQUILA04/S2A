/**
 * Simple password strength score for setup / activate UI (0–100).
 */

export function scorePasswordStrength(password: string): number {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    return Math.min(100, score);
}

export function passwordStrengthLabel(score: number): {
    label: string;
    tone: "destructive" | "primary" | "success";
} {
    if (score < 40) return { label: "Faible", tone: "destructive" };
    if (score <= 70) return { label: "Moyen", tone: "primary" };
    return { label: "Fort", tone: "success" };
}
