import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Server-side Supabase client using the service role key.
 * ONLY use this in Server Actions and API routes — NEVER expose to the browser.
 * The service role key bypasses Row Level Security (RLS).
 */
export function createServerSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error(
            "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. " +
            "Please check your .env.local file."
        );
    }

    if (!supabaseServiceKey) {
        throw new Error(
            "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. " +
            "Please check your .env.local file."
        );
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Public (anon) Supabase client for client-side operations.
 * Respects Row Level Security (RLS).
 */
export function createPublicSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error(
            "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
        );
    }

    if (!supabaseAnonKey) {
        throw new Error(
            "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }

    return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
