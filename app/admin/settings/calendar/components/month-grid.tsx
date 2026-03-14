"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toggleBlackoutMonth } from "../actions";
import { ChevronLeft, ChevronRight, CheckCircle, Ban, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { BlackoutMonth } from "@/types/database.types";

const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

interface MonthGridProps {
    initialData: BlackoutMonth[];
    year: number;
}

export function MonthGrid({ initialData, year }: MonthGridProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [optimisticData, addOptimistic] = useOptimistic(
        initialData,
        (state, newMonth: { month: number; is_active: boolean; reason?: string }) => {
            const index = state.findIndex(m => m.month === newMonth.month);
            if (index >= 0) {
                const newState = [...state];
                newState[index] = { ...newState[index], ...newMonth };
                return newState;
            }
            return [...state, { id: "opt", year, created_at: "", ...newMonth } as BlackoutMonth];
        }
    );

    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [reason, setReason] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loadingIds, setLoadingIds] = useState<number[]>([]);

    const handleToggle = (month: number, currentIsActive: boolean) => {
        if (currentIsActive) {
            // Making it NOT active (removing blackout)
            startTransition(() => { void executeToggle(month, false); });
        } else {
            // Making it active (adding blackout) - requires reason
            setSelectedMonth(month);
            setReason("");
            setDialogOpen(true);
        }
    };

    const confirmBlackout = () => {
        if (!selectedMonth || !reason.trim()) return;
        startTransition(() => { void executeToggle(selectedMonth, true, reason); });
        setDialogOpen(false);
    };

    const executeToggle = async (month: number, isActive: boolean, providedReason?: string) => {
        setLoadingIds(prev => [...prev, month]);
        addOptimistic({ month, is_active: isActive, reason: providedReason });

        try {
            const res = await toggleBlackoutMonth(year, month, isActive, providedReason);
            if (res.error) {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
                router.refresh(); // Sync back true state on failure
            } else {
                toast({ title: "Calendrier mis à jour", description: "Le recalcul des soldes est en cours." });
            }
        } catch (e) {
            console.error(e);
            router.refresh();
        } finally {
            setLoadingIds(prev => prev.filter(id => id !== month));
        }
    };

    const changeYear = (delta: number) => {
        startTransition(() => {
            router.push(`/admin/settings/calendar?year=${year + delta}`);
        });
    };

    // Calculate grid data (1-12)
    const grid = Array.from({ length: 12 }).map((_, i) => {
        const monthNum = i + 1;
        const data = optimisticData.find(m => m.month === monthNum);
        const isBlackout = data?.is_active ?? false;

        return {
            month: monthNum,
            name: MONTH_NAMES[i],
            isBlackout,
            reason: data?.reason ?? "",
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => changeYear(-1)} disabled={isPending || year <= 2016}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xl font-bold flex items-center gap-2">
                    {year}
                    {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <Button variant="outline" size="icon" onClick={() => changeYear(1)} disabled={isPending}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {grid.map(item => {
                    const isLoading = loadingIds.includes(item.month);
                    return (
                        <Card
                            key={item.month}
                            className={cn(
                                "transition-colors",
                                item.isBlackout ? "bg-[#E9ECEF] border-muted" : "bg-card"
                            )}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className={cn("text-lg", item.isBlackout && "line-through text-muted-foreground")}>
                                    {item.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm min-h-[40px] text-muted-foreground">
                                    {item.isBlackout ? (
                                        <span className="flex items-start gap-2">
                                            <Ban className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                            <span>{item.reason}</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2 text-primary">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Mois Actif</span>
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant={item.isBlackout ? "outline" : "secondary"}
                                    className="w-full"
                                    onClick={() => handleToggle(item.month, item.isBlackout)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (item.isBlackout ? "Réactiver ce mois" : "Désactiver (Blackout)")}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mois de Blackout</DialogTitle>
                        <DialogDescription>
                            Veuillez indiquer la raison pour laquelle ce mois est défini comme inactif (ex: Suspension COVID).
                            Les membres ne devront pas de cotisation pour ce mois.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Raison du blackout..."
                            onKeyDown={e => {
                                if (e.key === "Enter" && reason.trim()) confirmBlackout();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                        <Button onClick={confirmBlackout} disabled={!reason.trim()}>Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
