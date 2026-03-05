/**
 * CopyButton — Reusable copy-to-clipboard button with visual feedback.
 *
 * Designed for the Payment Declaration Wizard (Story 2.2) and any other
 * place that needs to let members copy treasury account numbers.
 *
 * Features:
 *  - Immediately transitions to "Copied!" state for 2 s then reverts
 *  - Uses navigator.clipboard with textarea fallback for non-secure contexts
 *  - Accessible: aria-label updates dynamically, role="status" on feedback text
 *  - Follows S2A design system (success color on copy, muted on idle)
 */

"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
    /** The text to write to the clipboard */
    text: string;
    /** Label shown next to the copy icon (defaults to "Copy") */
    label?: string;
    /** Optional extra className to merge */
    className?: string;
    /** Duration in ms to show "Copied!" feedback (default: 2000) */
    feedbackDuration?: number;
    /** Size variant */
    size?: "sm" | "md";
}

export function CopyButton({
    text,
    label = "Copy",
    className,
    feedbackDuration = 2000,
    size = "sm",
}: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback for non-HTTPS or old browsers
            const el = document.createElement("textarea");
            el.value = text;
            el.style.position = "fixed";
            el.style.opacity = "0";
            document.body.appendChild(el);
            el.focus();
            el.select();
            try { document.execCommand("copy"); } catch { /* silent */ }
            document.body.removeChild(el);
        }

        setCopied(true);
        const timer = setTimeout(() => setCopied(false), feedbackDuration);
        return () => clearTimeout(timer);
    }

    const sizeClass = size === "md"
        ? "h-10 rounded-lg px-3 text-sm gap-2"
        : "h-7 rounded-md px-2 text-xs gap-1";

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied to clipboard!" : `Copy ${label}`}
            title={copied ? "Copied!" : `Copy ${label}`}
            className={cn(
                "inline-flex shrink-0 items-center font-medium transition-all",
                "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                sizeClass,
                copied
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
                className
            )}
        >
            {copied ? (
                <>
                    <Check className={size === "md" ? "h-4 w-4" : "h-3 w-3"} aria-hidden="true" />
                    <span role="status">Copied!</span>
                </>
            ) : (
                <>
                    <Copy className={size === "md" ? "h-4 w-4" : "h-3 w-3"} aria-hidden="true" />
                    <span>{label}</span>
                </>
            )}
        </button>
    );
}
