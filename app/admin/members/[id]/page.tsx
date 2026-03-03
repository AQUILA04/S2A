import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberById } from "@/app/admin/members/actions";
import { AssociationStatusBadge } from "@/components/s2a/status-badge";
import { ArrowLeft, MoreVertical, Wallet, Check, AlertCircle, ArrowDownLeft, TrendingUp, UserRound } from "lucide-react";

export const dynamic = "force-dynamic";

interface MemberProfilePageProps {
    params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
    const { id } = await params;
    const result = await getMemberById(id);

    if (result.error || !result.data) {
        notFound();
    }

    const member = result.data;
    const joinedDate = new Date(member.join_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });

    // Mock functions for UI presentation matching the mockup (until Epic 3 is done)
    const mockBalance = 2450000;
    const mockFunctioningFund = 2;
    const mockSavingsBalance = 10;

    return (
        <div className="bg-white min-h-screen pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b">
                <Link href="/admin/members" className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold">Member Profile</h1>
                <button className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            {/* Profile Hero */}
            <div className="flex flex-col items-center mt-8 px-4">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                        {/* Placeholder for actual image */}
                        <div className="w-full h-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                            <UserRound className="w-12 h-12" />
                        </div>
                    </div>
                    {/* Active dot */}
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-white"></div>
                </div>

                <h2 className="text-2xl font-bold mt-4 text-[#001030]">
                    {member.first_name} {member.last_name}
                </h2>

                <div className="flex items-center mt-1.5 space-x-2 text-sm text-muted-foreground font-medium">
                    <AssociationStatusBadge status={member.status} />
                    <span>•</span>
                    <span>Joined {joinedDate}</span>
                </div>

                {/* Actions */}
                <div className="flex w-full gap-3 mt-6">
                    <button className="flex-1 bg-[#002366] text-white rounded-lg py-3 flex items-center justify-center font-semibold text-sm shadow-sm hover:bg-[#002366]/90 transition-colors">
                        <Wallet className="w-4 h-4 mr-2" />
                        Record Payment
                    </button>
                    <Link href={`/admin/members/${member.id}/edit`} className="flex-1 bg-[#F1F3F5] text-[#002366] rounded-lg py-3 flex items-center justify-center font-semibold text-sm hover:bg-[#E9ECEF] transition-colors">
                        <UserRound className="w-4 h-4 mr-2" />
                        Edit Profile
                    </Link>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-8 px-4">
                <h3 className="text-xs font-bold text-muted-foreground tracking-wider mb-3">FINANCIAL SUMMARY</h3>

                <div className="bg-[#002366] rounded-xl p-5 text-white shadow-sm relative overflow-hidden">
                    <div className="absolute right-4 top-4 text-white/20">
                        <Wallet className="w-16 h-16" />
                    </div>
                    <div className="text-3xl font-bold mt-2 relative z-10">
                        {mockBalance.toLocaleString("en-US")} CFA
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white border rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Functioning Fund</div>
                        <div className="flex items-baseline">
                            <span className="text-xl font-bold">{mockFunctioningFund}</span>
                            <span className="text-sm text-muted-foreground ml-1">/12</span>
                            <span className="text-xs text-muted-foreground ml-1">Months</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted mt-3 rounded-full overflow-hidden">
                            <div className="h-full bg-[#002366] rounded-full" style={{ width: `${(mockFunctioningFund / 12) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white border rounded-xl p-4 shadow-sm">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Savings Balance</div>
                        <div className="flex items-baseline">
                            <span className="text-xl font-bold">{mockSavingsBalance}</span>
                            <span className="text-sm text-muted-foreground ml-1">/12</span>
                            <span className="text-xs text-muted-foreground ml-1">Months</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted mt-3 rounded-full overflow-hidden">
                            <div className="h-full bg-[#002366] rounded-full" style={{ width: `${(mockSavingsBalance / 12) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contribution Calendar */}
            <div className="mt-8 px-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-muted-foreground tracking-wider">CONTRIBUTION CALENDAR</h3>
                    <span className="text-xs text-muted-foreground font-medium">2024</span>
                </div>

                <div className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="grid grid-cols-4 gap-3">
                        {/* Mock data for calendar */}
                        {[{ m: "JAN", s: "PAID" }, { m: "FEB", s: "PAID" }, { m: "MAR", s: "ARREARS" }, { m: "APR", s: "UPCOMING" },
                        { m: "MAY", s: "UPCOMING" }, { m: "JUN", s: "UPCOMING" }, { m: "JUL", s: "UPCOMING" }, { m: "AUG", s: "UPCOMING" }]
                            .map((item) => (
                                <div key={item.m} className="flex flex-col items-center">
                                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center mb-1.5 ${item.s === "PAID" ? "bg-success text-white" :
                                            item.s === "ARREARS" ? "bg-destructive text-white" :
                                                "bg-muted/50"
                                        }`}>
                                        {item.s === "PAID" && <Check className="w-4 h-4" />}
                                        {item.s === "ARREARS" && <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.m}</span>
                                </div>
                            ))}
                    </div>

                    <div className="flex items-center gap-4 mt-6 pt-4 border-t border-dashed">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-success"></div>
                            <span className="text-[10px] font-bold text-muted-foreground">Paid</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-destructive"></div>
                            <span className="text-[10px] font-bold text-muted-foreground">Arrears</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-muted"></div>
                            <span className="text-[10px] font-bold text-muted-foreground">Upcoming</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="mt-8 px-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-muted-foreground tracking-wider">RECENT TRANSACTIONS</h3>
                    <button className="text-xs font-bold text-[#002366]">View All</button>
                </div>

                <div className="space-y-3">
                    {/* Transaction 1 */}
                    <div className="bg-white border rounded-xl p-4 flex items-center shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-5 h-5" />
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                            <div className="font-bold text-sm text-[#001030] truncate">Monthly Contribution</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Oct 12, 2023 • Cash</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-sm text-[#001030]">+50,000</div>
                            <div className="text-[10px] font-bold text-success uppercase mt-0.5">PAID</div>
                        </div>
                    </div>

                    {/* Transaction 2 */}
                    <div className="bg-white border rounded-xl p-4 flex items-center shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-[#002366]">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div className="ml-3 flex-1 overflow-hidden">
                            <div className="font-bold text-sm text-[#001030] truncate">Project Investment</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Sep 28, 2023 • Real Estate</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-sm text-[#001030]">-250,000</div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">DEBITED</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
