import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function InactiveAlertBox() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="bg-destructive/10 p-6 shadow-lg rounded-xl flex flex-col items-center border-2 border-destructive max-w-sm text-center m-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-bold text-destructive mb-2">Compte Inactif</h3>
        <p className="text-destructive font-bold text-lg mb-6">
          Action Requise : Votre compte est inactif. Veuillez régulariser vos arriérés.
        </p>
        <Link 
          href="/dashboard/payment" 
          className="w-full text-center block bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-3 rounded-lg font-semibold transition-colors"
        >
          Régulariser ma situation
        </Link>
      </div>
    </div>
  );
}
