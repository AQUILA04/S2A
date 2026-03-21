import React from "react";
import { render, screen, within } from "@testing-library/react";
import { ContributionCalendar } from "@/app/dashboard/components/contribution-calendar";
import type { TimelineEntry } from "@/lib/services/balance.service";

// Helper: build a minimal timeline entry
function makeEntry(
  month: number,
  year: number,
  status: TimelineEntry["status"],
  note?: string
): TimelineEntry {
  return { month, year, amount: status === "PAID" ? 1000 : 0, status, note };
}

// ─────────────────────────────────────────────────────
//  ContributionCalendar — Rendering Tests (RTL)
// ─────────────────────────────────────────────────────

describe("ContributionCalendar", () => {
  // ── Loading State ────────────────────────────────────
  describe("Loading state", () => {
    it("renders a skeleton with the correct aria-label when isLoading is true", () => {
      render(<ContributionCalendar data={[]} isLoading={true} />);
      const skeleton = screen.getByRole("status", {
        name: /chargement du calendrier/i,
      });
      expect(skeleton).toBeInTheDocument();
      // Should NOT render year sections
      expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    });
  });

  // ── Empty state ──────────────────────────────────────
  describe("Empty data", () => {
    it("shows an empty message when data is empty and not loading", () => {
      render(<ContributionCalendar data={[]} isLoading={false} />);
      expect(
        screen.getByText(/aucune donnée disponible/i)
      ).toBeInTheDocument();
    });
  });

  // ── PAID month ───────────────────────────────────────
  describe("PAID month tile", () => {
    it("renders a PAID month with the correct accessible label", () => {
      const data: TimelineEntry[] = [makeEntry(1, 2026, "PAID")];
      render(<ContributionCalendar data={data} isLoading={false} />);

      // aria-label pattern: "Jan 2026: Payé"
      const tile = screen.getByRole("img", { name: /Jan 2026.*Payé/i });
      expect(tile).toBeInTheDocument();
    });

    it("uses the success check icon (✓) for a PAID month", () => {
      const data: TimelineEntry[] = [makeEntry(3, 2026, "PAID")];
      render(<ContributionCalendar data={data} isLoading={false} />);
      // Get the tile and then look for the icon span within it
      const tile = screen.getByRole("img", { name: /Mar 2026.*Payé/i });
      const icon = within(tile).getByText("✓");
      expect(icon).toBeInTheDocument();
    });
  });

  // ── UNPAID month ─────────────────────────────────────
  describe("UNPAID month tile", () => {
    it("renders an UNPAID month with the correct accessible label", () => {
      const data: TimelineEntry[] = [makeEntry(2, 2026, "UNPAID")];
      render(<ContributionCalendar data={data} isLoading={false} />);

      const tile = screen.getByRole("img", { name: /Fév 2026.*Impayé/i });
      expect(tile).toBeInTheDocument();
    });
  });

  // ── BLACKOUT month with tooltip ──────────────────────
  describe("BLACKOUT month tile", () => {
    it("renders a BLACKOUT month with informational tooltip (title attribute)", () => {
      const data: TimelineEntry[] = [
        makeEntry(6, 2025, "BLACKOUT", "Période d'exception"),
      ];
      render(<ContributionCalendar data={data} isLoading={false} />);

      // When a note is provided, the aria-label and title both use the note text
      const tile = screen.getByRole("img", { name: /Juin 2025.*Période d'exception/i });
      // The tooltip is on the tile's title attribute
      expect(tile).toHaveAttribute("title", "Période d'exception");
    });

    it("renders BLACKOUT with default tooltip when no note is provided", () => {
      const data: TimelineEntry[] = [makeEntry(4, 2025, "BLACKOUT")];
      render(<ContributionCalendar data={data} isLoading={false} />);

      // No note → default tooltip and aria-label use generic text
      const tile = screen.getByRole("img", { name: /Avr 2025.*Mois suspendu \(congé collectif\)/i });
      expect(tile).toHaveAttribute(
        "title",
        "Mois suspendu (congé collectif)"
      );
    });
  });

  // ── Year grouping ────────────────────────────────────
  describe("Year grouping", () => {
    it("groups timeline entries by year in ascending order", () => {
      const data: TimelineEntry[] = [
        makeEntry(1, 2025, "PAID"),
        makeEntry(12, 2025, "UNPAID"),
        makeEntry(1, 2026, "PAID"),
      ];
      render(<ContributionCalendar data={data} isLoading={false} />);

      const yearHeadings = screen.getAllByRole("heading", { level: 3 });
      expect(yearHeadings).toHaveLength(2);
      expect(yearHeadings[0]).toHaveTextContent("2025");
      expect(yearHeadings[1]).toHaveTextContent("2026");
    });
  });

  // ── Legend ───────────────────────────────────────────
  describe("Legend", () => {
    it("renders the legend with Payé, Impayé, and Suspendu labels", () => {
      const data: TimelineEntry[] = [makeEntry(1, 2026, "PAID")];
      render(<ContributionCalendar data={data} isLoading={false} />);

      expect(screen.getByText("Payé")).toBeInTheDocument();
      expect(screen.getByText("Impayé")).toBeInTheDocument();
      expect(screen.getByText("Suspendu")).toBeInTheDocument();
    });
  });

  // ── memberId passthrough (Treasurer reuse) ───────────
  describe("memberId prop", () => {
    it("accepts an optional memberId without error", () => {
      const data: TimelineEntry[] = [makeEntry(1, 2026, "PAID")];
      expect(() =>
        render(
          <ContributionCalendar
            memberId="some-treasurer-id"
            data={data}
            isLoading={false}
          />
        )
      ).not.toThrow();
    });
  });

  // ── Minimum touch targets (accessibility) ───────────
  describe("Touch targets", () => {
    it("renders month tiles with min-h-[44px] and min-w-[44px] classes for touch target compliance", () => {
      const data: TimelineEntry[] = [makeEntry(1, 2026, "PAID")];
      render(<ContributionCalendar data={data} isLoading={false} />);

      // Tiles are rendered as role="img" divs
      const tile = screen.getByRole("img", { name: /Jan 2026/i });
      expect(tile.className).toMatch(/min-h-\[44px\]/);
      expect(tile.className).toMatch(/min-w-\[44px\]/);
    });
  });
});
