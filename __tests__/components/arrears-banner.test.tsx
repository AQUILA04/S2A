import { render, screen } from "@testing-library/react";
import { ArrearsBanner } from "@/components/s2a/arrears-banner";

describe("ArrearsBanner Component", () => {
    it("renders the arrears warning message correctly", () => {
        render(<ArrearsBanner amount={15000} />);
        
        expect(screen.getByText(/Attention : Vous avez des arriérés de/i)).toBeInTheDocument();
        expect(screen.getByText(/15 000 CFA/i)).toBeInTheDocument();
    });

    it("displays the correct currency if provided", () => {
        render(<ArrearsBanner amount={500} currency="EUR" />);
        
        expect(screen.getByText(/500 EUR/i)).toBeInTheDocument();
    });
});
