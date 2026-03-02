import "next-auth";
import type { MemberRole } from "@/types/database.types";

declare module "next-auth" {
    interface User {
        id: string;
        role: MemberRole;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: MemberRole;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: MemberRole;
    }
}
