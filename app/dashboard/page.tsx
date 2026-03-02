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

    return (
        <main className="flex min-h-screen flex-col p-8">
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="mt-2 text-gray-600">
                Bienvenue, {userName} ({userRole})
            </p>
        </main>
    );
}
