"use client";

import * as React from "react";
import {
    Smartphone,
    Building2,
    Globe,
    Banknote,
    Pencil,
    Trash2,
    Plus,
    Check,
    Copy,
    Loader2,
} from "lucide-react";
import type { PaymentChannel, PaymentChannelRow } from "@/types/database.types";
import { cn } from "@/lib/utils";
import {
    createPaymentChannel,
    updatePaymentChannel,
    deletePaymentChannel,
    togglePaymentChannel,
} from "./actions";

// ============================================================
// Re-export types needed by parent page (Server Component)
// ============================================================
export type { PaymentChannelRow };

// ============================================================
// Icon map per channel type
// ============================================================
const CHANNEL_ICONS: Record<PaymentChannel, React.ElementType> = {
    MOBILE_MONEY: Smartphone,
    BANK_TRANSFER: Building2,
    INTL_TRANSFER: Globe,
    CASH: Banknote,
};

const CHANNEL_LABELS: Record<PaymentChannel, string> = {
    MOBILE_MONEY: "Mobile Money",
    BANK_TRANSFER: "Bank Transfer",
    INTL_TRANSFER: "International Transfer",
    CASH: "Cash",
};

// ============================================================
// CopyButton — copy-to-clipboard with visual feedback
// ============================================================
function CopyButton({ text, label }: { text: string; label?: string }) {
    const [copied, setCopied] = React.useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for non-secure contexts
            const el = document.createElement("textarea");
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={`Copy ${label ?? "to clipboard"}`}
            aria-label={copied ? "Copied!" : `Copy ${label ?? text}`}
            className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all",
                "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                copied
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            )}
        >
            {copied ? (
                <><Check className="h-3 w-3" />Copied!</>
            ) : (
                <><Copy className="h-3 w-3" />{label ?? "Copy"}</>
            )}
        </button>
    );
}

// ============================================================
// Toggle Switch
// ============================================================
function ToggleSwitch({
    checked,
    onChange,
    disabled,
    id,
}: {
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
    id?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label="Toggle active state"
            id={id}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
                "transition-colors duration-200 ease-in-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "bg-success" : "bg-muted-foreground/30"
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}

// ============================================================
// Data row inside a channel card
// ============================================================
function DataRow({ label, value, copyable, preserveWhitespace }: { label: string; value: string; copyable?: boolean; preserveWhitespace?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-2 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                {label}
            </span>
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn("text-xs font-medium text-foreground text-right break-all", preserveWhitespace && "whitespace-pre-wrap text-left max-w-[200px]")}>{value}</span>
                {copyable && value && <CopyButton text={value} label={label.toLowerCase()} />}
            </div>
        </div>
    );
}

// ============================================================
// PaymentChannelCard
// ============================================================
interface PaymentChannelCardProps {
    channel: PaymentChannelRow;
    onToggle: (id: string, val: boolean) => Promise<void>;
    onEdit: (channel: PaymentChannelRow) => void;
    onDelete: (id: string) => Promise<void>;
    isTogglingId?: string;
    isDeletingId?: string;
}

function PaymentChannelCard({
    channel,
    onToggle,
    onEdit,
    onDelete,
    isTogglingId,
    isDeletingId,
}: PaymentChannelCardProps) {
    const Icon = CHANNEL_ICONS[channel.channel_type] ?? Banknote;
    const isToggling = isTogglingId === channel.id;
    const isDeleting = isDeletingId === channel.id;

    return (
        <div
            className={cn(
                "rounded-xl border bg-card shadow-sm transition-all",
                channel.is_active ? "border-border" : "border-dashed border-muted-foreground/30 opacity-70"
            )}
        >
            {/* Card Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{channel.provider_name}</p>
                    <p className="text-xs text-muted-foreground">{CHANNEL_LABELS[channel.channel_type]}</p>
                </div>
                {/* Active toggle */}
                <div className="flex items-center gap-2">
                    {isToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <ToggleSwitch
                        id={`toggle-${channel.id}`}
                        checked={channel.is_active}
                        onChange={(val) => onToggle(channel.id, val)}
                        disabled={isToggling}
                    />
                </div>
            </div>

            {/* Card Body — data rows */}
            <div className="px-4 pb-3 pt-2 space-y-0.5">
                <DataRow label="Account / Phone" value={channel.account_number} copyable />
                <DataRow label="Merchant Name" value="Amicale S2A" />
                {channel.instructions && (
                    <DataRow label="Instructions" value={channel.instructions} preserveWhitespace />
                )}
            </div>

            {/* Card Footer — edit / delete */}
            <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3">
                <button
                    type="button"
                    onClick={() => onEdit(channel)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium",
                        "border border-border bg-muted/50 text-foreground",
                        "hover:bg-accent hover:border-primary/30 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    aria-label={`Edit ${channel.provider_name}`}
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit details
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(channel.id)}
                    disabled={isDeleting}
                    className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                        "border border-destructive/30 bg-destructive/5 text-destructive",
                        "hover:bg-destructive/10 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label={`Delete ${channel.provider_name}`}
                >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    );
}

// ============================================================
// ChannelForm — used for both create and edit
// ============================================================
const PAYMENT_CHANNEL_OPTIONS: { value: PaymentChannel; label: string }[] = [
    { value: "MOBILE_MONEY", label: "Mobile Money" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "INTL_TRANSFER", label: "International Transfer" },
    { value: "CASH", label: "Cash" },
];

interface ChannelFormProps {
    initial?: Partial<PaymentChannelRow>;
    onSubmit: (data: {
        provider_name: string;
        channel_type: PaymentChannel;
        account_number: string;
        instructions: string | null;
    }) => Promise<void>;
    onCancel?: () => void;
    isSubmitting?: boolean;
    submitLabel?: string;
}

export function ChannelForm({
    initial,
    onSubmit,
    onCancel,
    isSubmitting,
    submitLabel = "Save Configuration",
}: ChannelFormProps) {
    const [providerName, setProviderName] = React.useState(initial?.provider_name ?? "");
    const [channelType, setChannelType] = React.useState<PaymentChannel>(
        initial?.channel_type ?? "MOBILE_MONEY"
    );
    const [accountNumber, setAccountNumber] = React.useState(initial?.account_number ?? "");
    const [instructions, setInstructions] = React.useState(initial?.instructions ?? "");
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    function validate() {
        const errs: Record<string, string> = {};
        if (!providerName.trim()) errs.provider_name = "Provider name is required";
        if (!accountNumber.trim()) errs.account_number = "Account / phone is required";
        return errs;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        await onSubmit({
            provider_name: providerName.trim(),
            channel_type: channelType,
            account_number: accountNumber.trim(),
            instructions: instructions.trim() || null,
        });
    }

    const inputClass = (field: string) =>
        cn(
            "flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm",
            "ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            errors[field] ? "border-destructive" : "border-input"
        );

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Provider Name */}
            <div>
                <label htmlFor="provider_name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Provider Name <span className="text-destructive">*</span>
                </label>
                <input
                    id="provider_name"
                    type="text"
                    placeholder="e.g. Moov Flooz, MoneyGram"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    className={inputClass("provider_name")}
                    aria-describedby={errors.provider_name ? "err-provider" : undefined}
                    aria-invalid={!!errors.provider_name}
                    disabled={isSubmitting}
                />
                {errors.provider_name && (
                    <p id="err-provider" role="status" className="mt-1 text-xs text-destructive">{errors.provider_name}</p>
                )}
            </div>

            {/* Channel Type */}
            <div>
                <label htmlFor="channel_type" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Channel Type <span className="text-destructive">*</span>
                </label>
                <select
                    id="channel_type"
                    value={channelType}
                    onChange={(e) => setChannelType(e.target.value as PaymentChannel)}
                    className={cn(inputClass("channel_type"), "cursor-pointer")}
                    disabled={isSubmitting}
                >
                    {PAYMENT_CHANNEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Account Number */}
            <div>
                <label htmlFor="account_number" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Account / Phone <span className="text-destructive">*</span>
                </label>
                <input
                    id="account_number"
                    type="text"
                    placeholder="e.g. +228 90 00 00 00"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className={inputClass("account_number")}
                    aria-describedby={errors.account_number ? "err-account" : undefined}
                    aria-invalid={!!errors.account_number}
                    disabled={isSubmitting}
                />
                {errors.account_number && (
                    <p id="err-account" role="status" className="mt-1 text-xs text-destructive">{errors.account_number}</p>
                )}
            </div>

            {/* Instructions */}
            <div>
                <label htmlFor="instructions" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Specific Instructions
                </label>
                <textarea
                    id="instructions"
                    placeholder="Tell members how to pay..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    className={cn(
                        "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
                        "ring-offset-background placeholder:text-muted-foreground resize-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    disabled={isSubmitting}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className={cn(
                            "flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground",
                            "hover:bg-accent transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground",
                        "hover:bg-primary/90 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

// ============================================================
// Toast notification (minimal)
// ============================================================
interface Toast {
    id: string;
    message: string;
    type: "success" | "error";
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
    if (toasts.length === 0) return null;
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 md:bottom-8"
        >
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        "w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
                        t.type === "success"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                    )}
                >
                    {t.type === "success" ? "✓ " : "✗ "}{t.message}
                </div>
            ))}
        </div>
    );
}

// ============================================================
// PaymentChannelsClient — main interactive component
// ============================================================
interface PaymentChannelsClientProps {
    initialChannels: PaymentChannelRow[];
    canWrite: boolean;
}

export function PaymentChannelsClient({ initialChannels, canWrite }: PaymentChannelsClientProps) {
    const [channels, setChannels] = React.useState<PaymentChannelRow[]>(initialChannels);
    const [showAddForm, setShowAddForm] = React.useState(false);
    const [editingChannel, setEditingChannel] = React.useState<PaymentChannelRow | null>(null);
    const [isTogglingId, setIsTogglingId] = React.useState<string | undefined>();
    const [isDeletingId, setIsDeletingId] = React.useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    function addToast(message: string, type: "success" | "error") {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }

    // Static imports of server actions
    async function handleToggle(id: string, val: boolean) {
        setIsTogglingId(id);
        const result = await togglePaymentChannel(id, val);
        setIsTogglingId(undefined);
        if (result.error) {
            addToast(result.error, "error");
        } else if (result.data) {
            setChannels((prev) => prev.map((c) => (c.id === id ? result.data! : c)));
            addToast(`Channel ${val ? "activated" : "deactivated"} successfully.`, "success");
        }
    }

    async function handleDelete(id: string) {
        const channel = channels.find((c) => c.id === id);
        if (!channel) return;
        if (!window.confirm(`Delete "${channel.provider_name}"? This cannot be undone.`)) return;

        setIsDeletingId(id);
        const result = await deletePaymentChannel(id);
        setIsDeletingId(undefined);
        if (result.error) {
            addToast(result.error, "error");
        } else {
            setChannels((prev) => prev.filter((c) => c.id !== id));
            addToast("Channel deleted.", "success");
        }
    }

    async function handleCreate(data: {
        provider_name: string;
        channel_type: PaymentChannel;
        account_number: string;
        instructions: string | null;
    }) {
        setIsSubmitting(true);
        const result = await createPaymentChannel(data);
        setIsSubmitting(false);
        if (result.error) {
            addToast(result.error, "error");
        } else if (result.data) {
            setChannels((prev) => [...prev, result.data!]);
            setShowAddForm(false);
            addToast("Payment channel created successfully.", "success");
        }
    }

    async function handleUpdate(data: {
        provider_name: string;
        channel_type: PaymentChannel;
        account_number: string;
        instructions: string | null;
    }) {
        if (!editingChannel) return;
        setIsSubmitting(true);
        const result = await updatePaymentChannel(editingChannel.id, data);
        setIsSubmitting(false);
        if (result.error) {
            addToast(result.error, "error");
        } else if (result.data) {
            setChannels((prev) => prev.map((c) => (c.id === editingChannel.id ? result.data! : c)));
            setEditingChannel(null);
            addToast("Payment channel updated.", "success");
        }
    }

    return (
        <>
            {/* ── Active Channels section ── */}
            <section>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">Active Channels</h2>
                        <p className="text-xs text-muted-foreground">
                            {channels.filter((c) => c.is_active).length} of {channels.length} active
                        </p>
                    </div>
                    {canWrite && (
                        <button
                            type="button"
                            id="add-new-channel-btn"
                            onClick={() => {
                                setShowAddForm((v) => !v);
                                setEditingChannel(null);
                            }}
                            className={cn(
                                "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                                "hover:bg-primary/90 transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            )}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            + Add New
                        </button>
                    )}
                </div>

                {channels.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-10 text-center">
                        <Banknote className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">No payment channels configured yet.</p>
                        {canWrite && (
                            <p className="mt-1 text-xs text-muted-foreground">Click &ldquo;+ Add New&rdquo; to configure the first channel.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {channels.map((channel) => (
                            <PaymentChannelCard
                                key={channel.id}
                                channel={channel}
                                onToggle={handleToggle}
                                onEdit={(ch) => {
                                    setEditingChannel(ch);
                                    setShowAddForm(false);
                                }}
                                onDelete={handleDelete}
                                isTogglingId={isTogglingId}
                                isDeletingId={isDeletingId}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Edit Modal / Card ── */}
            {editingChannel && (
                <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-1 text-base font-semibold">Edit Channel</h2>
                    <p className="mb-4 text-xs text-muted-foreground">Update details for &ldquo;{editingChannel.provider_name}&rdquo;</p>
                    <ChannelForm
                        initial={editingChannel}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingChannel(null)}
                        isSubmitting={isSubmitting}
                        submitLabel="Save Changes"
                    />
                </section>
            )}

            {/* ── Quick Edit / Add Template Form ── */}
            {showAddForm && (
                <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-1 text-base font-semibold">Quick Add Template</h2>
                    <p className="mb-4 text-xs text-muted-foreground">Configure fields for a new channel</p>
                    <ChannelForm
                        onSubmit={handleCreate}
                        onCancel={() => setShowAddForm(false)}
                        isSubmitting={isSubmitting}
                    />
                </section>
            )}

            {/* Access denied notice */}
            {!canWrite && (
                <p className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    You do not have permission to modify payment channels. Contact the Treasurer or President.
                </p>
            )}

            <ToastContainer toasts={toasts} />
        </>
    );
}
