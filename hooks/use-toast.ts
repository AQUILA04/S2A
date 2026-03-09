"use client";

import { useCallback } from "react";

interface ToastProps {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
}

/**
 * A shim for shadcn/ui useToast since it is not installed in the project yet.
 * Uses standard browser alert/console for now to fulfill Story requirements.
 */
export function useToast() {
    const toast = useCallback(({ title, description, variant }: ToastProps) => {
        const message = `[${variant === 'destructive' ? 'ERROR' : 'INFO'}] ${title}: ${description}`;
        console.log(message);
        if (typeof window !== 'undefined') {
            alert(`${title}\n${description}`);
        }
    }, []);

    return { toast };
}
