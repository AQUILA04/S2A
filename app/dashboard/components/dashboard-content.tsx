import { getMemberBalanceAction } from "@/app/dashboard/actions";
import { KpiCard } from "@/components/s2a/kpi-card";
import { ArrearsBanner } from "@/components/s2a/arrears-banner";
import { PullToRefresh } from "@/components/s2a/pull-to-refresh";
import { ContributionCalendar } from "./contribution-calendar";
import { InactiveAlertBox } from "./inactive-alert-box";
import { cn } from "@/lib/utils";

export async function DashboardContent({ memberId }: { memberId: string }) {
  // Fetch real-time balanced data securely via Server Action
  const response = await getMemberBalanceAction({ memberId });
  
  if (response.error || !response.data) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive">
        <h3 className="font-bold">Erreur de chargement</h3>
        <p>{response.error || "Impossible de charger les données financières."}</p>
      </div>
    );
  }

  const balance = response.data;
  const isInactive = balance.status === "INACTIVE";

  return (
    <div className="relative">
      {/* INACTIVE STATE OVERLAY */}
      {isInactive && <InactiveAlertBox />}

      {/* WRAPPED MAIN CONTENT */}
      <div className={cn(isInactive && "grayscale opacity-50 pointer-events-none")}>
        <PullToRefresh>
          {balance.arrears > 0 && !isInactive && (
            <ArrearsBanner amount={balance.arrears} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <KpiCard 
              label="Total Versé" 
              value={balance.totalPaid.toLocaleString("fr-FR")} 
              variant="primary" 
              className="lg:col-span-2" 
            />
            <KpiCard 
              label="Fonds Fonct. (2/12)" 
              value={balance.operatingFees.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} 
              variant="secondary" 
            />
            <KpiCard 
              label="Solde Épargne (10/12)" 
              value={balance.availableBalance.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} 
              variant="gold" 
            />
          </div>

          {/* Contribution Calendar — visible immediately below counters (AC: 4) */}
          <div className="mt-6">
            <ContributionCalendar
              memberId={memberId}
              data={balance.timeline}
              isLoading={false}
            />
          </div>
        </PullToRefresh>
      </div>
    </div>
  );
}

