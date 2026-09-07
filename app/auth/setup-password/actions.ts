"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { hashPassword } from "@/lib/auth/helpers";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ActionResult } from "@/app/admin/members/types";

const changePasswordSchema = z
    .object({
        password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
        confirmPassword: z.string().min(1, "Confirmez votre mot de passe"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
    });

export async function changeForcedPassword(
    rawData: unknown
): Promise<ActionResult<{ updated: boolean }>> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Vous devez être connecté." };
    }
    if (!session.user.mustChangePassword) {
        return { error: "Aucun changement de mot de passe requis." };
    }

    const parsed = changePasswordSchema.safeParse(rawData);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        parsed.error.errors.forEach((err) => {
            const field = err.path.join(".");
            if (!fieldErrors[field]) fieldErrors[field] = [];
            fieldErrors[field].push(err.message);
        });
        return { error: "Validation failed", fieldErrors };
    }

    const password_hash = await hashPassword(parsed.data.password);
    const supabase = createServerSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("Members") as any)
        .update({
            password_hash,
            must_change_password: false,
        })
        .eq("id", session.user.id)
        .eq("must_change_password", true);

    if (error) {
        return { error: `Échec de la mise à jour: ${error.message}` };
    }

    return { data: { updated: true } };
}
