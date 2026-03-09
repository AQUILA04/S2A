import { PaymentWizard } from "./payment-wizard";

export const metadata = {
    title: "Déclaration de paiement | Amicale S2A",
};

export default function PaymentDeclarationPage() {
    return (
        <main className="flex flex-col p-4 md:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Déclaration de paiement</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Déclarez vos cotisations ou autres paiements effectués via nos canaux numériques.
                </p>
            </div>

            <div className="max-w-2xl mx-auto w-full">
                <PaymentWizard />
            </div>
        </main>
    );
}
