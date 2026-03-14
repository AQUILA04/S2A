import * as React from "react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string;
  currency?: string;
  variant: "primary" | "secondary" | "gold";
  className?: string;
}

const variantMap = {
  primary:   "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  gold:      "bg-gold text-gold-foreground",
};

export function KpiCard({ label, value, currency = "CFA", variant, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-xl p-6 shadow-sm flex flex-col justify-between", variantMap[variant], className)}>
      <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-4">{label}</p>
      <p className="font-mono text-3xl font-bold tracking-tight">
        {value} <span className="text-sm font-normal opacity-90">{currency}</span>
      </p>
    </div>
  );
}
