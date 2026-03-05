import { createServerSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

/**
 * Strict set of audit action types. Extend this union when new write actions are added.
 */
export type AuditActionType =
    | "CREATE_MEMBER"
    | "UPDATE_MEMBER"
    | "LEGACY_IMPORT"
    | "CREATE_PAYMENT_CHANNEL"
    | "UPDATE_PAYMENT_CHANNEL"
    | "DELETE_PAYMENT_CHANNEL";

export interface AuditLogPayload {
    actor_id: string;
    action_type: AuditActionType;
    metadata: Record<string, unknown>;
}

type AuditLogInsert = Database["public"]["Tables"]["AuditLogs"]["Insert"];

/**
 * Standard utility for writing to the AuditLogs table correctly.
 * Intentionally catches and swallows insertion errors to prevent rollback of the parent action.
 *
 * @param payload Payload containing actor_id, action_type, and metadata (e.g. old_value, new_value)
 */
export async function logAudit(payload: AuditLogPayload): Promise<void> {
    if (!payload.actor_id) {
        console.warn("[logAudit] Missing actor_id — audit entry skipped");
        return;
    }

    const supabase = createServerSupabaseClient();

    const insertPayload = {
        actor_id: payload.actor_id,
        action_type: payload.action_type,
        metadata: payload.metadata,
    } satisfies AuditLogInsert;

    const { error } = await supabase
        .from("AuditLogs")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertPayload as unknown as any);

    if (error) {
        // Non-fatal — log but do not roll back the parent action
        console.warn(`[logAudit] Failed to write AuditLog (${payload.action_type}):`, error.message);
    }
}
