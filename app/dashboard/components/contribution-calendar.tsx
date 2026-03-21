"use client";

import { cn } from "@/lib/utils";
import type { TimelineEntry } from "@/lib/services/balance.service";

// ─────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────

export interface ContributionCalendarProps {
  /** Optional memberId — allows Treasurers to reuse the calendar on member detail pages */
  memberId?: string;
  /** Timeline data from getMemberBalance */
  data: TimelineEntry[];
  /** Whether the parent is still loading data (shows skeleton) */
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────

const MONTH_LABELS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

// S2A semantic token classes mapped to timeline status
const STATUS_STYLES: Record<
  TimelineEntry["status"],
  { bg: string; text: string; border: string; icon: string; ariaLabel: string }
> = {
  PAID: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/40",
    icon: "✓",
    ariaLabel: "Payé",
  },
  UNPAID: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/40",
    icon: "✗",
    ariaLabel: "Impayé",
  },
  BLACKOUT: {
    bg: "bg-muted",
    text: "text-muted-foreground line-through",
    border: "border-border",
    icon: "⊘",
    ariaLabel: "Mois suspendu",
  },
};

// ─────────────────────────────────────────────────────
//  Skeleton Loading State
// ─────────────────────────────────────────────────────

export function ContributionCalendarSkeleton() {
  // Render a skeleton that matches the approximate shape of 2 year-rows × 12 months
  return (
    <div
      role="status"
      aria-label="Chargement du calendrier de cotisations…"
      className="animate-pulse space-y-6"
    >
      {[0, 1].map((row) => (
        <div key={row} className="space-y-3">
          {/* Year heading skeleton */}
          <div className="h-5 w-24 rounded-md bg-muted" />
          {/* Month tiles skeleton — 12 tiles */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-12">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg bg-muted"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  Month Tile
// ─────────────────────────────────────────────────────

interface MonthTileProps {
  entry: TimelineEntry;
}

function MonthTile({ entry }: MonthTileProps) {
  const { month, year, status, note } = entry;
  const label = MONTH_LABELS_FR[month - 1];
  const styles = STATUS_STYLES[status];
  const title =
    status === "BLACKOUT"
      ? note ?? "Mois suspendu (congé collectif)"
      : styles.ariaLabel;

  return (
    <div
      title={title}
      role="img"
      aria-label={`${label} ${year}: ${title}`}
      className={cn(
        "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center",
        "rounded-lg border p-1 text-center transition-opacity hover:opacity-80",
        styles.bg,
        styles.border
      )}
    >
      <span className={cn("text-[10px] font-bold uppercase leading-tight", styles.text)}>
        {label}
      </span>
      <span
        className={cn("mt-0.5 text-sm font-semibold leading-none", styles.text)}
        aria-hidden="true"
      >
        {styles.icon}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  Year Group
// ─────────────────────────────────────────────────────

interface YearGroupProps {
  year: number;
  entries: TimelineEntry[];
}

function YearGroup({ year, entries }: YearGroupProps) {
  return (
    <section aria-label={`Année ${year}`} className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{year}</h3>
      {/* Pure CSS Grid — no calendar library needed for 12 tiles */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-12">
        {entries.map((entry) => (
          <MonthTile key={`${entry.year}-${entry.month}`} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────

export function ContributionCalendar({ memberId, data, isLoading }: ContributionCalendarProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-member-id={memberId}>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Calendrier de Cotisations
        </h2>
        <ContributionCalendarSkeleton />
      </div>
    );
  }

  // Group timeline entries by year, preserving chronological order
  const byYear = data.reduce<Map<number, TimelineEntry[]>>((acc, entry) => {
    if (!acc.has(entry.year)) acc.set(entry.year, []);
    acc.get(entry.year)!.push(entry);
    return acc;
  }, new Map());

  // Sort years ascending
  const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" data-member-id={memberId}>
      {/* Header with title and legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Calendrier de Cotisations
        </h2>
        {/* Legend — color MUST NOT be the only indicator (§6 Accessibility) */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success/70" aria-hidden="true" />
            <span>Payé</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive/70" aria-hidden="true" />
            <span>Impayé</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span>Suspendu</span>
          </span>
        </div>
      </div>

      {/* Year groups */}
      <div className="space-y-5" role="list" aria-label="Calendrier de cotisations par année">
        {sortedYears.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        ) : (
          sortedYears.map((year) => (
            <YearGroup key={year} year={year} entries={byYear.get(year)!} />
          ))
        )}
      </div>
    </div>
  );
}
