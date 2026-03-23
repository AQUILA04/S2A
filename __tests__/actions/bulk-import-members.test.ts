import { bulkImportMembers } from "@/app/admin/members/actions";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit/logger";

jest.mock("next-auth", () => ({
    getServerSession: jest.fn().mockResolvedValue({
        user: { id: "test-admin-id", role: "SG" },
    }),
}));

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(),
}));

jest.mock("@/lib/auth/helpers", () => ({
    hashPassword: jest.fn().mockResolvedValue("hashed-password-123"),
}));

jest.mock("@/lib/audit/logger", () => ({
    logAudit: jest.fn().mockResolvedValue(undefined),
}));

describe("bulkImportMembers Action", () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            or: jest.fn(),
            insert: jest.fn(),
        };

        (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    it("should successfully import members with no duplicates", async () => {
        // Mock existing members as empty arrays
        mockSupabase.or.mockResolvedValue({ data: [], error: null });
        mockSupabase.insert.mockResolvedValue({ error: null });

        const payload = [
            {
                id: "123e4567-e89b-12d3-a456-426614174000",
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                phone: "12345678",
                join_date: "2023-01-01",
                monthly_fee: 1000,
                role: "MEMBER" as const,
            }
        ];

        const result = await bulkImportMembers(payload);

        expect(result.error).toBeUndefined();
        expect(result.data?.successCount).toBe(1);
        expect(result.data?.failureCount).toBe(0);
        expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
        expect(logAudit).toHaveBeenCalled();
    });

    it("should report failures for duplicate emails and phones", async () => {
        // Mock existing members containing duplicate email and phone
        mockSupabase.or.mockResolvedValue({ 
            data: [
                { email: "john@example.com", phone: "existing-phone" }, // duplicate email
                { email: "other@example.com", phone: "87654321" } // duplicate phone
            ], 
            error: null 
        });
        mockSupabase.insert.mockResolvedValue({ error: null });

        const payload = [
            { // Duplicate email (will fail)
                id: "uuid-1",
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                phone: "11111111",
                role: "MEMBER" as const,
            },
            { // Duplicate phone (will fail)
                id: "uuid-2",
                first_name: "Jane",
                last_name: "Smith",
                email: "jane.new@example.com",
                phone: "87654321",
                role: "MEMBER" as const,
            },
            { // Valid member
                id: "uuid-3",
                first_name: "Valid",
                last_name: "User",
                email: "valid@example.com",
                phone: "99999999",
                role: "MEMBER" as const,
            }
        ];

        const result = await bulkImportMembers(payload);

        expect(result.error).toBeUndefined();
        expect(result.data?.successCount).toBe(1);
        expect(result.data?.failureCount).toBe(2);
        
        expect(result.data?.failedRows).toEqual([
            { row: 2, errors: ["Email existe déjà"] },
            { row: 3, errors: ["Téléphone existe déjà"] }
        ]);
        
        // Only 1 valid user should be inserted
        expect(mockSupabase.insert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ email: "valid@example.com" })
            ])
        );
        expect(mockSupabase.insert.mock.calls[0][0]).toHaveLength(1);
    });

    it("should return error when no data provided", async () => {
        const result = await bulkImportMembers([]);
        expect(result.error).toBe("Aucune donnée fournie");
    });
});
