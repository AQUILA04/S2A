import { notFound } from "next/navigation";
import { getMemberById } from "@/app/admin/members/actions";
import { EditMemberForm } from "@/app/admin/members/[id]/edit/edit-member-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Force dynamic to always fetch latest member data
export const dynamic = "force-dynamic";

interface EditMemberPageProps {
    params: Promise<{ id: string }>;
}

/**
 * /admin/members/[id]/edit — Edit Member Page (Server Component)
 * Pre-loads member via getMemberById, then delegates to the client form.
 * AC: 4
 */
export default async function EditMemberPage({ params }: EditMemberPageProps) {
    const { id } = await params;

    if (!id) {
        notFound();
    }

    const result = await getMemberById(id);

    if (result.error || !result.data) {
        notFound();
    }

    const member = result.data;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    Modifier — {member.last_name} {member.first_name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Email : <strong>{member.email}</strong> · Adhésion : {new Date(member.join_date).toLocaleDateString("fr-FR")}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Modifier le profil</CardTitle>
                </CardHeader>
                <CardContent>
                    <EditMemberForm member={member} />
                </CardContent>
            </Card>
        </div>
    );
}
