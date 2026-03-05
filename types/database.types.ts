/**
 * Database types for Amicale S2A
 * Auto-generated structure matching the Supabase PostgreSQL schema.
 * Run `npm run db:generate-types` to regenerate from a live Supabase instance.
 */

/** Membership / cotisation status. Set automatically by the balance engine. */
export type MemberStatus = "ACTIVE" | "INACTIVE";

/** User account / login status. Set at member creation; activated via invitation link. */
export type AccountStatus = "PENDING_ACTIVATION" | "ACTIVE";

export type MemberRole =
    | "MEMBER"
    | "PRESIDENT"          // Full rights: SG + TREASURER + all admin settings
    | "SG"                 // Secrétaire Général — write access to Members & Settings
    | "SG_ADJOINT"         // Deputy SG — same rights as SG
    | "TREASURER"          // Trésorier — write access to Contributions, Validation & Settings
    | "TRESORIER_ADJOINT"; // Deputy Treasurer — same rights as TREASURER

export type PaymentChannel =
    | "CASH"
    | "MOBILE_MONEY"
    | "BANK_TRANSFER"
    | "INTL_TRANSFER";

export type ContributionStatus = "PENDING" | "VALIDATED" | "REJECTED";

export interface Member {
    id: string; // UUID
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    join_date: string; // ISO date string "YYYY-MM-DD"
    monthly_fee: number;
    /** Association/cotisation status — ACTIVE (paying) or INACTIVE (≥24 months arrears) */
    status: MemberStatus;
    /** User account login status — PENDING_ACTIVATION (not yet set password) or ACTIVE (can log in) */
    account_status: AccountStatus;
    role: MemberRole;
    password_hash: string;
    created_at_app: string; // ISO timestamp
}

export interface Contribution {
    id: string; // UUID
    member_id: string; // UUID FK -> Members.id
    amount: number;
    month: number; // 1-12
    year: number; // >= 2016
    payment_channel: PaymentChannel;
    reference_id: string | null; // Unique, nullable for CASH
    status: ContributionStatus;
    validator_id: string | null; // UUID FK -> Members.id
    validated_at: string | null; // ISO timestamp
    created_at: string; // ISO timestamp
}

/** A treasury payment channel configured by the Executive Board. */
export interface PaymentChannelRow {
    id: string; // UUID
    provider_name: string;
    channel_type: PaymentChannel;
    account_number: string;
    instructions: string | null;
    is_active: boolean;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    updated_by: string | null; // UUID FK -> Members.id
}

export interface BlackoutMonth {
    id: string; // UUID
    month: number; // 1-12
    year: number; // >= 2016
    reason: string;
    is_active: boolean;
    created_at: string; // ISO timestamp
}

export interface ProjectInvestment {
    id: string; // UUID
    member_id: string; // UUID FK -> Members.id
    project_name: string;
    amount: number;
    date: string; // ISO date string "YYYY-MM-DD"
    created_at: string; // ISO timestamp
}

export interface EBExpense {
    id: string; // UUID
    description: string;
    amount: number;
    category: string;
    date: string; // ISO date string "YYYY-MM-DD"
    receipt_url: string | null;
    created_at: string; // ISO timestamp
}

export interface AuditLog {
    id: string; // UUID
    actor_id: string; // UUID FK -> Members.id
    action_type: string; // e.g. "VALIDATE_PAYMENT", "UPDATE_MEMBER"
    metadata: AuditMetadata; // JSONB
    timestamp: string; // ISO timestamp
}

export interface AuditMetadata {
    old_value?: Record<string, unknown>;
    new_value?: Record<string, unknown>;
    [key: string]: unknown;
}

// ============================================================
// Supabase Database type map (used for typed client)
// ============================================================

export interface Database {
    public: {
        Tables: {
            Members: {
                Row: Member;
                Insert: Omit<Member, "id" | "created_at_app"> & {
                    id?: string;
                    created_at_app?: string;
                };
                Update: Partial<Omit<Member, "id">>;
            };
            Contributions: {
                Row: Contribution;
                Insert: Omit<Contribution, "id" | "created_at"> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<Contribution, "id">>;
            };
            BlackoutMonths: {
                Row: BlackoutMonth;
                Insert: Omit<BlackoutMonth, "id" | "created_at"> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<BlackoutMonth, "id">>;
            };
            ProjectInvestments: {
                Row: ProjectInvestment;
                Insert: Omit<ProjectInvestment, "id" | "created_at"> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<ProjectInvestment, "id">>;
            };
            EBExpenses: {
                Row: EBExpense;
                Insert: Omit<EBExpense, "id" | "created_at"> & {
                    id?: string;
                    created_at?: string;
                };
                Update: Partial<Omit<EBExpense, "id">>;
            };
            AuditLogs: {
                Row: AuditLog;
                Insert: Omit<AuditLog, "id" | "timestamp"> & {
                    id?: string;
                    timestamp?: string;
                };
                Update: Partial<Omit<AuditLog, "id">>;
            };
            PaymentChannels: {
                Row: PaymentChannelRow;
                Insert: Omit<PaymentChannelRow, "id" | "created_at" | "updated_at"> & {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Omit<PaymentChannelRow, "id" | "created_at">>;
            };
        };
        Enums: {
            member_status: MemberStatus;
            account_status: AccountStatus;
            member_role: MemberRole;
            payment_channel: PaymentChannel;
            contribution_status: ContributionStatus;
        };
    };
}
