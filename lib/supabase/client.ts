/**
 * Server-side database client (Postgres via postgres.js).
 * API surface mirrors the previous Supabase service-role client used by server actions.
 */
export { createServerSupabaseClient, from } from "@/lib/db/query-builder";
