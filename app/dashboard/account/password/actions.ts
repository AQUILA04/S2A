"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ActionResult } from "@/app/admin/members/types";
import { hashPassword, verifyPassword } from "@/lib/auth/helpers";
import { createServerSupabaseClient } from "@/lib/supabase/client";

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Saisissez votre mot de passe actuel"),
        newPassword: z
            .string()
            .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
        confirmPassword: z.string().min(1, "Confirmez votre nouveau mot de passe"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
    });

export async function changePassword(
    rawData: unknown
): Promise<ActionResult<{ updated: boolean }>> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Vous devez être connecté." };
    }

    const parsed = changePasswordSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((error) => {
            const field = error.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(error.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const supabase = createServerSupabaseClient();
    const { data: member, error: fetchError } = await supabase
        .from("Members")
        .select("password_hash")
        .eq("id", session.user.id)
        .single();

    if (fetchError || !member) {
        return { error: "Impossible de vérifier votre compte." };
    }

    const currentPasswordIsValid = await verifyPassword(
        parsed.data.currentPassword,
        member.password_hash as string
    );
    if (!currentPasswordIsValid) {
        return {
            error: "Le mot de passe actuel est incorrect.",
            fieldErrors: {
                currentPassword: ["Le mot de passe actuel est incorrect."],
            },
        };
    }

    const passwordIsUnchanged = await verifyPassword(
        parsed.data.newPassword,
        member.password_hash as string
    );
    if (passwordIsUnchanged) {
        return {
            error: "Choisissez un mot de passe différent.",
            fieldErrors: {
                newPassword: ["Le nouveau mot de passe doit être différent de l’actuel."],
            },
        };
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("Members") as any)
        .update({ password_hash: passwordHash })
        .eq("id", session.user.id);

    if (updateError) {
        return { error: `Échec de la mise à jour : ${updateError.message}` };
    }

    return { data: { updated: true } };
}
