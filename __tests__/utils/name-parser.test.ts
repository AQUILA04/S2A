import { parseFullName } from "@/lib/utils/name-parser";

describe("name-parser", () => {
    it("should prioritize exact NOM and PRÉNOM", () => {
        const result = parseFullName("Doe", "John", "Smith Jane");
        expect(result.firstName).toBe("John");
        expect(result.lastName).toBe("Doe");
    });

    it("should fallback to splitting FULL NAME if NOM is missing", () => {
        const result = parseFullName("", "John", "Doe Jane Smith");
        expect(result.firstName).toBe("John");
        expect(result.lastName).toBe("Doe"); 
    });

    it("should gracefully handle only FULL NAME", () => {
        const result = parseFullName("", "", "Bamba Amadou");
        expect(result.firstName).toBe("Amadou");
        expect(result.lastName).toBe("Bamba");
    });

    it("should handle three part names correctly", () => {
        const result = parseFullName("", "", "Diop Jean Claude");
        expect(result.firstName).toBe("Jean Claude");
        expect(result.lastName).toBe("Diop");
    });
    
    it("should handle empty inputs", () => {
        const result = parseFullName("", "", "");
        expect(result.firstName).toBe("");
        expect(result.lastName).toBe("");
    });
});
