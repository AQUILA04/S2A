"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMember } from "@/app/admin/members/actions";
import type { MemberRole } from "@/types/database.types";

// Role options for the dropdown
const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
    { value: "MEMBER", label: "Membre" },
    { value: "SG", label: "Secrétaire Général" },
    { value: "SG_ADJOINT", label: "SG Adjoint" },
    { value: "TREASURER", label: "Trésorier" },
    { value: "TRESORIER_ADJOINT", label: "Trésorier Adjoint" },
    { value: "PRESIDENT", label: "Président" },
];

interface FormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    join_date: string;
    monthly_fee: string;
    role: MemberRole;
    password: string;
}

interface FormErrors {
    first_name?: string[];
    last_name?: string[];
    email?: string[];
    phone?: string[];
    join_date?: string[];
    monthly_fee?: string[];
    role?: string[];
    password?: string[];
    _form?: string[];
}

/**
 * /admin/members/new — Create Member Form (Client Component)
 * AC: 2, 3
 */
export default function NewMemberPage() {
    const router = useRouter();

    const [formData, setFormData] = useState<FormData>({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        join_date: new Date().toISOString().split("T")[0],
        monthly_fee: "",
        role: "MEMBER",
        password: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});
        setSuccessMessage("");

        const payload = {
            ...formData,
            monthly_fee: parseFloat(formData.monthly_fee),
        };

        const result = await createMember(payload);

        if (result.error) {
            setErrors(result.fieldErrors ?? { _form: [result.error] });
            setIsSubmitting(false);
            return;
        }

        // Success — show toast and redirect
        setSuccessMessage("Membre créé avec succès !");
        setTimeout(() => {
            router.push("/admin/members");
        }, 1200);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Ajouter un Membre</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Le nouveau membre aura le statut <strong>PENDING ACTIVATION</strong> jusqu&apos;à sa validation.
                </p>
            </div>

            {/* Success toast */}
            {successMessage && (
                <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg bg-success/10 border border-success/30 p-4 text-success font-semibold"
                >
                    ✅ {successMessage}
                </div>
            )}

            {/* Form-level error */}
            {errors._form && (
                <div
                    role="alert"
                    className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-destructive"
                >
                    {errors._form.join(", ")}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Informations du Membre</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* First & Last Name */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="first_name" className="text-sm font-medium">
                                    Prénom <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="Jean"
                                    required
                                    aria-invalid={!!errors.first_name}
                                    aria-describedby={errors.first_name ? "first_name-error" : undefined}
                                />
                                {errors.first_name && (
                                    <p id="first_name-error" className="text-xs text-destructive">
                                        {errors.first_name[0]}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="last_name" className="text-sm font-medium">
                                    Nom <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Dupont"
                                    required
                                    aria-invalid={!!errors.last_name}
                                    aria-describedby={errors.last_name ? "last_name-error" : undefined}
                                />
                                {errors.last_name && (
                                    <p id="last_name-error" className="text-xs text-destructive">
                                        {errors.last_name[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="membre@exemple.org"
                                required
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "email-error" : undefined}
                            />
                            {errors.email && (
                                <p id="email-error" className="text-xs text-destructive">
                                    {errors.email[0]}
                                </p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-1">
                            <label htmlFor="phone" className="text-sm font-medium">
                                Téléphone <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+225 07 00 00 00 00"
                                required
                                aria-invalid={!!errors.phone}
                                aria-describedby={errors.phone ? "phone-error" : undefined}
                            />
                            {errors.phone && (
                                <p id="phone-error" className="text-xs text-destructive">
                                    {errors.phone[0]}
                                </p>
                            )}
                        </div>

                        {/* Join Date & Monthly Fee */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="join_date" className="text-sm font-medium">
                                    Date d&apos;adhésion <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="join_date"
                                    name="join_date"
                                    type="date"
                                    value={formData.join_date}
                                    onChange={handleChange}
                                    required
                                    aria-invalid={!!errors.join_date}
                                    aria-describedby={errors.join_date ? "join_date-error" : undefined}
                                />
                                {errors.join_date && (
                                    <p id="join_date-error" className="text-xs text-destructive">
                                        {errors.join_date[0]}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="monthly_fee" className="text-sm font-medium">
                                    Cotisation mensuelle (CFA) <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="monthly_fee"
                                    name="monthly_fee"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.monthly_fee}
                                    onChange={handleChange}
                                    placeholder="10000"
                                    required
                                    aria-invalid={!!errors.monthly_fee}
                                    aria-describedby={errors.monthly_fee ? "monthly_fee-error" : undefined}
                                />
                                {errors.monthly_fee && (
                                    <p id="monthly_fee-error" className="text-xs text-destructive">
                                        {errors.monthly_fee[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-1">
                            <label htmlFor="role" className="text-sm font-medium">
                                Rôle <span className="text-destructive">*</span>
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-invalid={!!errors.role}
                                aria-describedby={errors.role ? "role-error" : undefined}
                            >
                                {ROLE_OPTIONS.map(({ value, label }) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            {errors.role && (
                                <p id="role-error" className="text-xs text-destructive">
                                    {errors.role[0]}
                                </p>
                            )}
                        </div>

                        {/* Initial Password */}
                        <div className="space-y-1">
                            <label htmlFor="password" className="text-sm font-medium">
                                Mot de passe initial <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Min. 8 caractères"
                                required
                                minLength={8}
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? "password-error" : "password-hint"}
                            />
                            <p id="password-hint" className="text-xs text-muted-foreground">
                                Le membre devra changer ce mot de passe lors de sa première connexion.
                            </p>
                            {errors.password && (
                                <p id="password-error" className="text-xs text-destructive">
                                    {errors.password[0]}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                id="create-member-submit"
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none"
                            >
                                {isSubmitting ? "Création en cours…" : "Créer le Membre"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Annuler
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
