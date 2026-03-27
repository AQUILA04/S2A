"use client";

import { useEffect } from "react";

export function DebugDashboardArrival() {
    useEffect(() => {
        // #region agent log
        fetch("http://127.0.0.1:7244/ingest/7d8a4cfb-3119-40e9-9e80-feacfcc42c79", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                runId: "post-fix",
                hypothesisId: "F3",
                location: "app/dashboard/components/debug-dashboard-arrival.tsx:useEffect",
                message: "Dashboard page reached in browser",
                data: {
                    path: window.location.pathname,
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion
    }, []);

    return null;
}
