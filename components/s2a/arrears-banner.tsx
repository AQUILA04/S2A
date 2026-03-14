import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArrearsBannerProps {
  amount: number;
  currency?: string;
  className?: string;
}

export function ArrearsBanner({ amount, currency = "CFA", className }: ArrearsBannerProps) {
  return (
    <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-6", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Attention : Retard de paiement</p>
          <p className="text-sm text-destructive/80 mt-1">
            Vous avez des arriérés de{" "}
            <span className="font-bold">
              {amount.toLocaleString("fr-FR")} {currency}
            </span>
            . Veuillez régulariser votre situation.
          </p>
        </div>
      </div>
    </div>
  );
}
