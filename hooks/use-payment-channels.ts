/**
 * usePaymentChannels
 *
 * Reusable hook to fetch active payment channels on the client side.
 * Designed to be consumed by Story 2.2 (Member Payment Declaration Wizard)
 * and any other component that needs to list available treasury channels.
 *
 * Usage:
 *   const { channels, isLoading, error } = usePaymentChannels();
 */

"use client";

import * as React from "react";
import type { PaymentChannelRow } from "@/types/database.types";

interface UsePaymentChannelsOptions {
    /** If true, only returns channels where is_active = true (default: true) */
    activeOnly?: boolean;
}

interface UsePaymentChannelsResult {
    channels: PaymentChannelRow[];
    isLoading: boolean;
    error: string | null;
    /** Call to re-fetch without a page reload */
    refresh: () => void;
}

import { getPaymentChannels } from "@/app/admin/settings/payment-channels/actions";

export function usePaymentChannels({
    activeOnly = true,
}: UsePaymentChannelsOptions = {}): UsePaymentChannelsResult {
    const [channels, setChannels] = React.useState<PaymentChannelRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [tick, setTick] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        getPaymentChannels(activeOnly)
            .then((result) => {
                if (cancelled) return;
                if (result.error) {
                    setError(result.error);
                } else {
                    setChannels(result.data ?? []);
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError((err as Error)?.message ?? "Unknown error fetching channels");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOnly, tick]);

    const refresh = React.useCallback(() => setTick((t) => t + 1), []);

    return { channels, isLoading, error, refresh };
}
