import { cn } from "@/lib/utils";
import type { MemberStatus, AccountStatus } from "@/types/database.types";

// ============================================================
// Association Status Badge (ACTIVE / INACTIVE)
// ============================================================

interface AssociationStatusBadgeProps {
    status: MemberStatus;
    className?: string;
}

/**
 * Displays the member's association/cotisation status.
 * ACTIVE = green, INACTIVE = red.
 */
export function AssociationStatusBadge({ status, className }: AssociationStatusBadgeProps) {
    const isActive = status === "ACTIVE";
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isActive
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                className
            )}
            aria-label={`Statut Cotisation: ${status}`}
        >
            <span
                className={cn(
                    "mr-1 h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-success" : "bg-destructive"
                )}
                aria-hidden="true"
            />
            {isActive ? "ACTIF" : "INACTIF"}
        </span>
    );
}

// ============================================================
// Account Status Badge (PENDING_ACTIVATION / ACTIVE)
// ============================================================

interface AccountStatusBadgeProps {
    status: AccountStatus;
    className?: string;
}

/**
 * Displays the member's account/login status.
 * PENDING_ACTIVATION = gold, ACTIVE = green.
 */
export function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
    const isActive = status === "ACTIVE";
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isActive
                    ? "bg-success/15 text-success"
                    : "bg-gold/20 text-yellow-700",
                className
            )}
            aria-label={`Statut Compte: ${status}`}
        >
            <span
                className={cn(
                    "mr-1 h-1.5 w-1.5 rounded-full",
                    isActive ? "bg-success" : "bg-gold"
                )}
                aria-hidden="true"
            />
            {isActive ? "ACTIF" : "EN ATTENTE"}
        </span>
    );
}
