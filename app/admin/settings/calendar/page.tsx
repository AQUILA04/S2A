import { getBlackoutMonthsByYear } from "./actions";
import { MonthGrid } from "./components/month-grid";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Calendar Settings | Amicale S2A",
    description: "Manage blackout months for the association",
};

interface PageProps {
    searchParams: Promise<{ year?: string }>;
}

export default async function CalendarSettingsPage({ searchParams }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "PRESIDENT") {
        redirect("/dashboard");
    }

    // Await searchParams since it's a promise in newer NextJS
    const params = await searchParams;
    const currentYear = new Date().getFullYear();
    const year = params.year ? parseInt(params.year, 10) : currentYear;

    const { data: blackoutMonths, error } = await getBlackoutMonthsByYear(year);

    if (error) {
        return (
            <div className="p-4 md:p-8 max-w-6xl mx-auto">
                <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                    Failed to load calendar settings. {error}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Calendar Settings</h2>
                    <p className="text-muted-foreground">
                        Manage active and blackout months. Blackout months are excluded from debt calculations.
                    </p>
                </div>
            </div>

            <MonthGrid initialData={blackoutMonths ?? []} year={year} />
        </div>
    );
}
