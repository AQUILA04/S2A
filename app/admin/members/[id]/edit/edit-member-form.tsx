"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssociationStatusBadge, AccountStatusBadge } from "@/components/s2a/status-badge";
import { updateMember } from "@/app/admin/members/actions";
import type { Member, MemberRole, MemberStatus, AccountStatus } from "@/types/database.types";

// Role options
const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
    { value: "MEMBER", label: "Membre" },
    { value: "SG", label: "Secrétaire Général" },
    { value: "SG_ADJOINT", label: "SG Adjoint" },
    { value: "TREASURER", label: "Trésorier" },
    { value: "TRESORIER_ADJOINT", label: "Trésorier Adjoint" },
    { value: "PRESIDENT", label: "Président" },
];

interface EditMemberFormProps {
    member: Member;
}

interface FormErrors {
    first_name?: string[];
    last_name?: string[];
    phone?: string[];
    monthly_fee?: string[];
    role?: string[];
    status?: string[];
    account_status?: string[];
    _form?: string[];
}

/**
 * Client component for the Edit Member form.
 * Receives the pre-loaded member from the server component page.
 * AC: 4
 */
export function EditMemberForm({ member }: EditMemberFormProps) {
    const router = useRouter();

    const [formData, setFormData] = useState({
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        monthly_fee: member.monthly_fee.toString(),
        role: member.role,
        status: member.status,
        account_status: member.account_status,
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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

        const result = await updateMember(member.id, payload);

        if (result.error) {
            setErrors(result.fieldErrors ?? { _form: [result.error] });
            setIsSubmitting(false);
            return;
        }

        // Success toast per UX spec: "Changes Saved & Logged"
        setSuccessMessage("Changes Saved & Logged");
        setIsSubmitting(false);
        setTimeout(() => {
            router.push("/admin/members");
        }, 1500);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-destructive">
                    {errors._form.join(", ")}
                </div>
            )}

            {/* Read-only: Email & Join Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                        Email (non modifiable)
                    </label>
                    <div className="flex h-12 items-center rounded-lg border border-input bg-muted/50 px-4 text-sm text-muted-foreground">
                        {member.email}
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                        Date d&apos;adhésion (non modifiable)
                    </label>
                    <div className="flex h-12 items-center rounded-lg border border-input bg-muted/50 px-4 text-sm text-muted-foreground">
                        {new Date(member.join_date).toLocaleDateString("fr-FR")}
                    </div>
                </div>
            </div>

            {/* Editable: First & Last Name */}
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
                        required
                        aria-invalid={!!errors.first_name}
                        aria-describedby={errors.first_name ? "first_name-error" : undefined}
                    />
                    {errors.first_name && (
                        <p id="first_name-error" className="text-xs text-destructive">{errors.first_name[0]}</p>
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
                        required
                        aria-invalid={!!errors.last_name}
                        aria-describedby={errors.last_name ? "last_name-error" : undefined}
                    />
                    {errors.last_name && (
                        <p id="last_name-error" className="text-xs text-destructive">{errors.last_name[0]}</p>
                    )}
                </div>
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
                    required
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                    <p id="phone-error" className="text-xs text-destructive">{errors.phone[0]}</p>
                )}
            </div>

            {/* Monthly Fee */}
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
                    required
                    aria-invalid={!!errors.monthly_fee}
                    aria-describedby={errors.monthly_fee ? "monthly_fee-error" : undefined}
                />
                {errors.monthly_fee && (
                    <p id="monthly_fee-error" className="text-xs text-destructive">{errors.monthly_fee[0]}</p>
                )}
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
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                {errors.role && (
                    <p id="role-error" className="text-xs text-destructive">{errors.role[0]}</p>
                )}
            </div>

            {/* Association Status toggle — "Statut Cotisation" */}
            <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                    Statut Cotisation (Association)
                </label>
                <div className="flex items-center gap-4">
                    <AssociationStatusBadge status={formData.status as MemberStatus} />
                    <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="h-12 rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-describedby="status-hint"
                    >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>
                </div>
                <p id="status-hint" className="text-xs text-muted-foreground">
                    ACTIVE = membre en règle de cotisation. INACTIVE = ≥ 24 mois d&apos;arriérés.
                </p>
            </div>

            {/* Account Status toggle — "Statut Compte" */}
            <div className="space-y-2">
                <label htmlFor="account_status" className="text-sm font-medium">
                    Statut Compte (Connexion)
                </label>
                <div className="flex items-center gap-4">
                    <AccountStatusBadge status={formData.account_status as AccountStatus} />
                    <select
                        id="account_status"
                        name="account_status"
                        value={formData.account_status}
                        onChange={handleChange}
                        className="h-12 rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-describedby="account_status-hint"
                    >
                        <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
                        <option value="ACTIVE">ACTIVE</option>
                    </select>
                </div>
                <p id="account_status-hint" className="text-xs text-muted-foreground">
                    PENDING ACTIVATION = compte créé, pas encore activé. Activez manuellement après configuration.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <Button
                    id="edit-member-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                >
                    {isSubmitting ? "Enregistrement…" : "Enregistrer les modifications"}
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
    );
}
