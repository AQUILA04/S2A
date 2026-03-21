import { render, screen } from "@testing-library/react";
import { InactiveAlertBox } from "@/app/dashboard/components/inactive-alert-box";

describe("InactiveAlertBox Component", () => {
    it("renders the inactive alert message and CTA correctly", () => {
        render(<InactiveAlertBox />);
        
        expect(screen.getByText("Compte Inactif")).toBeInTheDocument();
        expect(screen.getByText(/Action Requise : Votre compte est inactif/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Régulariser ma situation/i })).toBeInTheDocument();
    });

    it("cta button links to the payment page", () => {
        render(<InactiveAlertBox />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/dashboard/payment");
    });
});
