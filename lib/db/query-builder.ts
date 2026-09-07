import { type Sql } from "postgres";
import { getSql } from "@/lib/db/sql";

export interface DbError {
    message: string;
    code?: string;
    details?: string;
}

// Loose typing matches former Supabase client usage at call sites
export interface DbResult<T = any> {
    data: T;
    error: DbError | null;
    count: number | null;
}

type Filter =
    | { type: "eq"; column: string; value: unknown }
    | { type: "in"; column: string; values: unknown[] }
    | { type: "or"; expression: string };

type OrderBy = { column: string; ascending: boolean };

function quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}

function mapPgError(err: unknown): DbError {
    const e = err as { message?: string; code?: string; detail?: string };
    return {
        message: e.message ?? String(err),
        code: e.code,
        details: e.detail,
    };
}

/** Parse PostgREST `.or()` fragments used in this codebase. */
function parseOrExpression(
    expression: string,
    params: unknown[]
): string {
    const parts = expression.split(",").map((p) => p.trim()).filter(Boolean);
    const sqlParts: string[] = [];

    for (const part of parts) {
        const ilikeMatch = part.match(/^([a-zA-Z0-9_]+)\.ilike\.(.+)$/);
        if (ilikeMatch) {
            const col = quoteIdent(ilikeMatch[1]);
            const pattern = ilikeMatch[2];
            params.push(pattern);
            sqlParts.push(`${col} ILIKE $${params.length}`);
            continue;
        }

        const inMatch = part.match(/^([a-zA-Z0-9_]+)\.in\.\((.+)\)$/);
        if (inMatch) {
            const col = quoteIdent(inMatch[1]);
            const raw = inMatch[2];
            const values = raw.split(",").map((v) => {
                const t = v.trim();
                if (
                    (t.startsWith('"') && t.endsWith('"')) ||
                    (t.startsWith("'") && t.endsWith("'"))
                ) {
                    return t.slice(1, -1);
                }
                return t;
            });
            params.push(values);
            sqlParts.push(`${col} = ANY($${params.length})`);
            continue;
        }

        throw new Error(`Unsupported .or() fragment: ${part}`);
    }

    return sqlParts.length ? `(${sqlParts.join(" OR ")})` : "TRUE";
}

class QueryBuilder<T = any> implements PromiseLike<DbResult<T>> {
    private table: string;
    private selectCols = "*";
    private wantCount = false;
    private headOnly = false;
    private filters: Filter[] = [];
    private orders: OrderBy[] = [];
    private rangeFrom: number | null = null;
    private rangeTo: number | null = null;
    private mode: "select" | "insert" | "update" | "upsert" = "select";
    private payload: unknown = null;
    private onConflict: string | null = null;
    private returning = false;
    private singleRow = false;
    private maybeSingleRow = false;

    constructor(table: string) {
        this.table = table;
    }

    select(
        columns: string = "*",
        options?: { count?: "exact"; head?: boolean }
    ): this {
        // After insert/update/upsert, .select() means RETURNING *
        if (this.mode !== "select") {
            this.returning = true;
        }
        this.selectCols = columns;
        if (options?.count === "exact") this.wantCount = true;
        if (options?.head) this.headOnly = true;
        return this;
    }

    insert(payload: unknown): this {
        this.mode = "insert";
        this.payload = payload;
        return this;
    }

    update(payload: Record<string, unknown>): this {
        this.mode = "update";
        this.payload = payload;
        return this;
    }

    upsert(
        payload: unknown,
        options?: { onConflict?: string }
    ): this {
        this.mode = "upsert";
        this.payload = payload;
        this.onConflict = options?.onConflict ?? null;
        return this;
    }

    eq(column: string, value: unknown): this {
        this.filters.push({ type: "eq", column, value });
        return this;
    }

    in(column: string, values: unknown[]): this {
        this.filters.push({ type: "in", column, values });
        return this;
    }

    or(expression: string): this {
        this.filters.push({ type: "or", expression });
        return this;
    }

    order(column: string, options?: { ascending?: boolean }): this {
        this.orders.push({
            column,
            ascending: options?.ascending !== false,
        });
        return this;
    }

    range(from: number, to: number): this {
        this.rangeFrom = from;
        this.rangeTo = to;
        return this;
    }

    single<U = T>(): QueryBuilder<U> {
        this.singleRow = true;
        this.returning = true;
        return this as unknown as QueryBuilder<U>;
    }

    maybeSingle<U = T>(): QueryBuilder<U> {
        this.maybeSingleRow = true;
        this.returning = true;
        return this as unknown as QueryBuilder<U>;
    }

    /** No-op compatibility with former Supabase `.returns<T>()`. */
    returns<U = T>(): QueryBuilder<U> {
        return this as unknown as QueryBuilder<U>;
    }

    /** After insert/update/upsert — return rows (Supabase chain). */
    // overload keeps chain typing loose for call sites that call .select() again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then<TResult1 = DbResult<T>, TResult2 = never>(
        onfulfilled?:
            | ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>)
            | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private buildWhere(params: unknown[]): string {
        if (this.filters.length === 0) return "";
        const clauses: string[] = [];
        for (const f of this.filters) {
            if (f.type === "eq") {
                params.push(f.value);
                clauses.push(`${quoteIdent(f.column)} = $${params.length}`);
            } else if (f.type === "in") {
                params.push(f.values);
                clauses.push(`${quoteIdent(f.column)} = ANY($${params.length})`);
            } else if (f.type === "or") {
                clauses.push(parseOrExpression(f.expression, params));
            }
        }
        return clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    }

    private async execute(): Promise<DbResult<T>> {
        const sql = getSql();
        const table = quoteIdent(this.table);

        try {
            if (this.mode === "insert") {
                return await this.execInsert(sql, table);
            }
            if (this.mode === "update") {
                return await this.execUpdate(sql, table);
            }
            if (this.mode === "upsert") {
                return await this.execUpsert(sql, table);
            }
            return await this.execSelect(sql, table);
        } catch (err) {
            return { data: null as T, error: mapPgError(err), count: null };
        }
    }

    private async execSelect(
        sql: Sql,
        table: string
    ): Promise<DbResult<T>> {
        const params: unknown[] = [];
        const where = this.buildWhere(params);

        let count: number | null = null;
        if (this.wantCount) {
            const countRows = await sql.unsafe(
                `SELECT COUNT(*)::int AS c FROM ${table}${where}`,
                params as never[]
            );
            count = Number(countRows[0]?.c ?? 0);
            if (this.headOnly) {
                return { data: null as T, error: null, count };
            }
        }

        const cols =
            this.selectCols.trim() === "*"
                ? "*"
                : this.selectCols
                      .split(",")
                      .map((c) => quoteIdent(c.trim()))
                      .join(", ");

        let orderSql = "";
        if (this.orders.length) {
            orderSql =
                " ORDER BY " +
                this.orders
                    .map(
                        (o) =>
                            `${quoteIdent(o.column)} ${o.ascending ? "ASC" : "DESC"}`
                    )
                    .join(", ");
        }

        let limitSql = "";
        if (this.rangeFrom !== null && this.rangeTo !== null) {
            const limit = this.rangeTo - this.rangeFrom + 1;
            params.push(limit);
            const limIdx = params.length;
            params.push(this.rangeFrom);
            const offIdx = params.length;
            limitSql = ` LIMIT $${limIdx} OFFSET $${offIdx}`;
        }

        const rows = await sql.unsafe(
            `SELECT ${cols} FROM ${table}${where}${orderSql}${limitSql}`,
            params as never[]
        );

        if (this.singleRow) {
            if (rows.length !== 1) {
                return {
                    data: null as T,
                    error: {
                        message:
                            rows.length === 0
                                ? "JSON object requested, multiple (or no) rows returned"
                                : "JSON object requested, multiple (or no) rows returned",
                        code: "PGRST116",
                    },
                    count,
                };
            }
            return { data: rows[0] as T, error: null, count };
        }

        if (this.maybeSingleRow) {
            if (rows.length > 1) {
                return {
                    data: null as T,
                    error: {
                        message: "JSON object requested, multiple rows returned",
                        code: "PGRST116",
                    },
                    count,
                };
            }
            return {
                data: ((rows[0] as T) ?? null) as T,
                error: null,
                count,
            };
        }

        return { data: rows as T, error: null, count };
    }

    private async execInsert(
        sql: Sql,
        table: string
    ): Promise<DbResult<T>> {
        const rows = Array.isArray(this.payload)
            ? (this.payload as Record<string, unknown>[])
            : [this.payload as Record<string, unknown>];

        if (rows.length === 0) {
            return { data: [], error: null, count: 0 } as DbResult<T>;
        }

        const keys = Object.keys(rows[0]);
        const colSql = keys.map(quoteIdent).join(", ");
        const params: unknown[] = [];
        const valueGroups: string[] = [];

        for (const row of rows) {
            const placeholders: string[] = [];
            for (const k of keys) {
                params.push(row[k]);
                placeholders.push(`$${params.length}`);
            }
            valueGroups.push(`(${placeholders.join(", ")})`);
        }

        const result = await sql.unsafe(
            `INSERT INTO ${table} (${colSql}) VALUES ${valueGroups.join(", ")} RETURNING *`,
            params as never[]
        );

        if (this.singleRow) {
            return { data: result[0] as T, error: null, count: result.length };
        }
        return {
            data: (Array.isArray(this.payload) ? result : result[0]) as T,
            error: null,
            count: result.length,
        };
    }

    private async execUpdate(
        sql: Sql,
        table: string
    ): Promise<DbResult<T>> {
        const payload = this.payload as Record<string, unknown>;
        const keys = Object.keys(payload);
        const params: unknown[] = [];
        const sets = keys.map((k) => {
            params.push(payload[k]);
            return `${quoteIdent(k)} = $${params.length}`;
        });
        const where = this.buildWhere(params);
        const ret = " RETURNING *";

        const result = await sql.unsafe(
            `UPDATE ${table} SET ${sets.join(", ")}${where}${ret}`,
            params as never[]
        );

        if (this.singleRow) {
            if (result.length !== 1) {
                return {
                    data: null as T,
                    error: {
                        message: "JSON object requested, multiple (or no) rows returned",
                        code: "PGRST116",
                    },
                    count: result.length,
                };
            }
            return { data: result[0] as T, error: null, count: result.length };
        }

        return {
            data: ((result as T) ?? null) as T,
            error: null,
            count: result.length,
        };
    }

    private async execUpsert(
        sql: Sql,
        table: string
    ): Promise<DbResult<T>> {
        const row = this.payload as Record<string, unknown>;
        const keys = Object.keys(row);
        const colSql = keys.map(quoteIdent).join(", ");
        const params: unknown[] = [];
        const placeholders = keys.map((k) => {
            params.push(row[k]);
            return `$${params.length}`;
        });

        // onConflict may be constraint name or column list
        let conflictTarget: string;
        if (this.onConflict === "unique_blackout_month_year") {
            conflictTarget = `(${quoteIdent("month")}, ${quoteIdent("year")})`;
        } else if (this.onConflict?.includes(",")) {
            conflictTarget = `(${this.onConflict
                .split(",")
                .map((c) => quoteIdent(c.trim()))
                .join(", ")})`;
        } else if (this.onConflict) {
            conflictTarget = `(${quoteIdent(this.onConflict)})`;
        } else {
            conflictTarget = `(${quoteIdent("id")})`;
        }

        const updates = keys
            .filter((k) => k !== "id")
            .map((k) => `${quoteIdent(k)} = EXCLUDED.${quoteIdent(k)}`)
            .join(", ");

        const result = await sql.unsafe(
            `INSERT INTO ${table} (${colSql}) VALUES (${placeholders.join(", ")})
             ON CONFLICT ${conflictTarget} DO UPDATE SET ${updates}
             RETURNING *`,
            params as never[]
        );

        if (this.singleRow || this.maybeSingleRow) {
            return { data: result[0] as T, error: null, count: result.length };
        }
        return { data: result as T, error: null, count: result.length };
    }
}

export function from(table: string): QueryBuilder {
    return new QueryBuilder(table);
}

export function createServerSupabaseClient() {
    return {
        from,
    };
}
