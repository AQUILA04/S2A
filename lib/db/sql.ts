import postgres from "postgres";

let sql: postgres.Sql | null = null;

/**
 * Shared postgres.js connection pool (server-only).
 * Use DATABASE_URL, e.g. postgresql://s2a:pass@localhost:5433/s2a
 */
export function getSql(): postgres.Sql {
    if (sql) return sql;

    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            "Missing environment variable: DATABASE_URL. " +
                "Example: postgresql://s2a:password@localhost:5433/s2a"
        );
    }

    sql = postgres(url, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        // Match former Supabase/PostgREST string dates (YYYY-MM-DD) for app logic
        types: {
            date: {
                to: 1082,
                from: [1082],
                parse: (x: string) => x,
                serialize: (x: unknown) => String(x).slice(0, 10),
            },
        },
    });

    return sql;
}

/** Reset pool (tests). */
export async function closeSql(): Promise<void> {
    if (sql) {
        await sql.end({ timeout: 5 });
        sql = null;
    }
}
