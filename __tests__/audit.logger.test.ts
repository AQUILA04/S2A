import { logAudit, type AuditActionType } from "@/lib/audit/logger";
import { createServerSupabaseClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({
    createServerSupabaseClient: jest.fn(),
}));

describe("logAudit", () => {
    let mockInsert: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockInsert = jest.fn().mockResolvedValue({ error: null });

        // Setup the typical mocked supabase client form
        (createServerSupabaseClient as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                insert: mockInsert,
            }),
        });

        // Mock console.warn
        jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        (console.warn as jest.Mock).mockRestore();
    });

    it("should correctly insert into AuditLogs with the provided payload", async () => {
        const payload = {
            actor_id: "123",
            action_type: "CREATE_MEMBER" as AuditActionType,
            metadata: { new_value: { id: "456", name: "Test" } },
        };

        await logAudit(payload);

        expect(mockInsert).toHaveBeenCalledWith({
            actor_id: "123",
            action_type: "CREATE_MEMBER",
            metadata: { new_value: { id: "456", name: "Test" } },
        });
    });

    it("should catch and warn on error without throwing", async () => {
        const mockError = new Error("DB Connection Failed");
        mockInsert.mockResolvedValueOnce({ error: mockError });

        const payload = {
            actor_id: "123",
            action_type: "CREATE_MEMBER" as AuditActionType,
            metadata: {},
        };

        // Assert that the Promise resolves, not rejects
        await expect(logAudit(payload)).resolves.toBeUndefined();

        // Assert that console.warn was called
        expect(console.warn).toHaveBeenCalledWith(
            "[logAudit] Failed to write AuditLog (CREATE_MEMBER):",
            "DB Connection Failed"
        );
    });

    it("should warn and return early when actor_id is empty", async () => {
        const payload = {
            actor_id: "",
            action_type: "CREATE_MEMBER" as AuditActionType,
            metadata: {},
        };

        await expect(logAudit(payload)).resolves.toBeUndefined();

        expect(console.warn).toHaveBeenCalledWith(
            "[logAudit] Missing actor_id \u2014 audit entry skipped"
        );
        // Supabase insert should NOT have been called
        expect(mockInsert).not.toHaveBeenCalled();
    });
});
