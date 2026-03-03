import { redirect } from "next/navigation";

/**
 * /admin root — redirects to /admin/members (the primary admin function)
 */
export default function AdminPage() {
    redirect("/admin/members");
}
