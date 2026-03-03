import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    // [L2] Use optional chaining — session.user is theoretically typed as
    // non-null here after the guard, but defensive coding prevents runtime throws
    // if NextAuth ever returns a session with a missing user object.
    const userName = session.user?.name ?? "Utilisateur";
    const userRole = session.user?.role ?? "MEMBER";

    const isAdmin = ["SG", "SG_ADJOINT", "TREASURER", "TRESORIER_ADJOINT", "PRESIDENT"].includes(userRole);

    return (
        <main className="flex min-h-screen flex-col p-8">
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="mt-2 text-gray-600">
                Bienvenue, {userName} ({userRole})
            </p>

            {isAdmin && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <a
                        href="/admin/members"
                        className="block rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <h2 className="text-lg font-semibold text-primary">Gestion des Membres</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            Accéder au registre des membres pour ajouter, modifier ou consulter les profils.
                        </p>
                    </a>
                </div>
            )}
        </main>
    );
}
