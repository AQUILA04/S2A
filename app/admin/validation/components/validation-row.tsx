"use client";

import { useOptimistic } from "react";
import { ValidationDrawer } from "./validation-drawer";

interface ValidationRowProps {
    contributionId: string;
    memberName: string;
    amount: number;
    channel: string;
    referenceId: string | null;
    declarationDate: string;
    periodLabel: string;
}

export function ValidationRow(props: ValidationRowProps) {
    const [optimisticDone, setOptimisticDone] = useOptimistic(false);

    // If acted upon optimistically, immediately hide the whole row
    if (optimisticDone) return null;

    return (
        <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-3 px-4 py-4 sm:py-3 sm:items-center hover:bg-muted/20 transition-colors">
            {/* Member name */}
            <div className="sm:col-span-3 font-semibold text-[#001030]">
                {props.memberName}
            </div>

            {/* Amount */}
            <div className="sm:col-span-2 font-mono font-bold text-[#001030]">
                {props.amount.toLocaleString("fr-FR")}
                <span className="text-xs font-normal text-muted-foreground ml-1">CFA</span>
            </div>

            {/* Channel */}
            <div className="sm:col-span-2 text-muted-foreground">
                {props.channel}
            </div>

            {/* Reference ID */}
            <div className="sm:col-span-2 font-mono text-xs text-muted-foreground truncate">
                {props.referenceId ?? <span className="italic">—</span>}
            </div>

            {/* Declaration date */}
            <div className="sm:col-span-2 text-muted-foreground text-xs">
                {props.declarationDate}
                <span className="ml-1 text-muted-foreground/70">
                    ({props.periodLabel})
                </span>
            </div>

            {/* Review action */}
            <div className="sm:col-span-1 mt-3 sm:mt-0 flex justify-end">
                <ValidationDrawer
                    {...props}
                    onActionComplete={() => setOptimisticDone(true)}
                />
            </div>
        </div>
    );
}
