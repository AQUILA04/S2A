import { getMemberBalanceAction } from "@/app/dashboard/actions";
import { KpiCard } from "@/components/s2a/kpi-card";
import { ArrearsBanner } from "@/components/s2a/arrears-banner";
import { PullToRefresh } from "@/components/s2a/pull-to-refresh";
import { ContributionCalendar } from "./contribution-calendar";


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
      {isInactive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="bg-card p-6 shadow-lg rounded-xl flex flex-col items-center border border-border max-w-sm text-center">
            <h3 className="text-xl font-bold text-destructive mb-2">Compte Inactif</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Votre compte a été suspendu suite à des arriérés prolongés. Vous devez régulariser votre situation pour débloquer vos actions d'investissement.
            </p>
            <a href="/dashboard/payment" className="w-full">
              <button className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-3 rounded-lg font-semibold transition-colors">
                Action Requise: Payer Arriérés
              </button>
            </a>
          </div>
        </div>
      )}

      {/* WRAPPED MAIN CONTENT */}
      <div className={isInactive ? "grayscale opacity-50 pointer-events-none" : ""}>
        <PullToRefresh>
          {balance.arrears > 0 && (
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

