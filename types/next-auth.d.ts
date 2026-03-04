import "next-auth";
import type { MemberRole, MemberStatus } from "@/types/database.types";

declare module "next-auth" {
    interface User {
        id: string;
        role: MemberRole;
        /** Association/cotisation status — passed through to session so the frontend
         *  can disable investment actions for INACTIVE members (AC4, Story 1.3). */
        status: MemberStatus;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: MemberRole;
            /** Association/cotisation status — ACTIVE (paying) or INACTIVE (≥24 months arrears).
             *  Use this to gate investment actions on the frontend. */
            status: MemberStatus;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: MemberRole;
        /** Association/cotisation status carried in the signed JWT. */
        status: MemberStatus;
    }
}
