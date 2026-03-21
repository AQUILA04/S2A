import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArrearsBannerProps {
  amount: number;
  currency?: string;
  className?: string;
}

export function ArrearsBanner({ amount, currency = "CFA", className }: ArrearsBannerProps) {
  return (
    <div className={cn("rounded-lg border border-destructive bg-destructive p-4 mb-6 text-destructive-foreground", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            Attention : Vous avez des arriérés de {amount.toLocaleString("fr-FR")} {currency}.
          </p>
        </div>
      </div>
    </div>
  );
}
