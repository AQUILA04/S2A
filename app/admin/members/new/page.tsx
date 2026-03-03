"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createMember } from "@/app/admin/members/actions";
import type { MemberRole } from "@/types/database.types";
import {
    ArrowLeft, UserRound, Mail, Phone, Briefcase,
    Calendar, Euro, Info, Send, Users, Wallet, Clock, ChevronDown
} from "lucide-react";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
    { value: "MEMBER", label: "Membre" },
    { value: "SG", label: "Secrétaire Général" },
    { value: "SG_ADJOINT", label: "SG Adjoint" },
    { value: "TREASURER", label: "Trésorier" },
    { value: "TRESORIER_ADJOINT", label: "Trésorier Adjoint" },
    { value: "PRESIDENT", label: "Président" },
];

export default function NewMemberPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        join_date: new Date().toISOString().split("T")[0],
        monthly_fee: "",
        role: "MEMBER" as MemberRole,
        password: "Temporaire123!" // Hidden password since mockup doesn't show it, user clicks link
    });

    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: undefined }));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});
        setSuccessMessage("");

        const payload = {
            ...formData,
            monthly_fee: parseFloat(formData.monthly_fee) || 0,
        };

        const result = await createMember(payload);

        if (result.error) {
            setErrors(result.fieldErrors ?? { _form: [result.error] });
            setIsSubmitting(false);
            return;
        }

        setSuccessMessage("Membre créé avec succès !");
        setTimeout(() => {
            router.push("/admin/members");
        }, 1200);
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 md:pb-8 text-sm">
            {/* Header */}
            <div className="bg-white flex items-center px-4 py-4 border-b">
                <Link href="/admin/members" className="p-2 -ml-2 text-[#002366] hover:bg-muted/30 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-base font-bold text-[#001030] ml-2">Amicale S2A</h1>
                <span className="text-xs text-muted-foreground ml-auto hidden sm:block">Portail Administration</span>
            </div>

            <div className="max-w-2xl mx-auto mt-6">
                <div className="bg-white mx-4 sm:mx-0 rounded-2xl p-5 shadow-sm border border-black/5">
                    <h2 className="text-xl font-bold text-[#001030]">Nouveau Membre</h2>
                    <p className="text-xs text-muted-foreground mt-1 mb-8">
                        Complétez les informations pour intégrer un nouveau membre à l'amicale.
                    </p>

                    {successMessage && (
                        <div className="mb-6 rounded-lg bg-success/10 border border-success/30 p-4 text-success text-sm font-semibold">
                            ✅ {successMessage}
                        </div>
                    )}

                    {errors._form && (
                        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-destructive text-sm font-semibold">
                            ❌ {errors._form.join(", ")}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8" noValidate>

                        {/* Section: Informations Personnelles */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[#002366] mb-2 font-bold uppercase tracking-wider text-xs">
                                <UserRound className="w-4 h-4" />
                                <h3>Informations Personnelles</h3>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="first_name" className="text-xs font-semibold text-[#001030]">Prénom</label>
                                <input
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    placeholder="Ex: Jean"
                                    className="w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all placeholder:text-muted-foreground/50 border-black/10"
                                />
                                {errors.first_name && <p className="text-xs text-destructive">{errors.first_name[0]}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="last_name" className="text-xs font-semibold text-[#001030]">Nom</label>
                                <input
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    placeholder="Ex: Dupont"
                                    className="w-full px-4 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all placeholder:text-muted-foreground/50 border-black/10"
                                />
                                {errors.last_name && <p className="text-xs text-destructive">{errors.last_name[0]}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="email" className="text-xs font-semibold text-[#001030]">Email</label>
                                <div className="relative">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="jean.dupont@email.com"
                                        className="w-full pl-4 pr-10 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all placeholder:text-muted-foreground/50 border-black/10"
                                    />
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
                                </div>
                                {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="phone" className="text-xs font-semibold text-[#001030]">Téléphone</label>
                                <div className="relative">
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="06 12 34 56 78"
                                        className="w-full pl-4 pr-10 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all placeholder:text-muted-foreground/50 border-black/10"
                                    />
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4" />
                                </div>
                                {errors.phone && <p className="text-xs text-destructive">{errors.phone[0]}</p>}
                            </div>
                        </div>

                        {/* Section: Détails de l'Adhésion */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 text-[#002366] mb-2 font-bold uppercase tracking-wider text-xs">
                                <Briefcase className="w-4 h-4" />
                                <h3>Détails de l'Adhésion</h3>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="join_date" className="text-xs font-semibold text-[#001030]">Date d'adhésion</label>
                                <div className="relative">
                                    <input
                                        id="join_date"
                                        name="join_date"
                                        type="date"
                                        value={formData.join_date}
                                        onChange={handleChange}
                                        className="w-full pl-4 pr-10 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all text-foreground border-black/10"
                                    />
                                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 pointer-events-none" />
                                </div>
                                {errors.join_date && <p className="text-xs text-destructive">{errors.join_date[0]}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="role" className="text-xs font-semibold text-[#001030]">Rôle au sein de l'amicale</label>
                                <div className="relative">
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full pl-4 pr-10 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all text-foreground border-black/10 appearance-none"
                                    >
                                        {ROLE_OPTIONS.map(({ value, label }) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="monthly_fee" className="text-xs font-semibold text-[#001030]">Cotisation mensuelle (CFA)</label>
                                <div className="relative">
                                    <input
                                        id="monthly_fee"
                                        name="monthly_fee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.monthly_fee}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className="w-full pl-4 pr-10 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#002366]/20 transition-all placeholder:text-muted-foreground/50 border-black/10"
                                    />
                                    <Euro className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 pointer-events-none" />
                                </div>
                                {errors.monthly_fee && <p className="text-xs text-destructive">{errors.monthly_fee[0]}</p>}
                            </div>
                        </div>

                        {/* Note Importante */}
                        <div className="bg-[#002366]/5 rounded-xl p-4 flex gap-3 border border-[#002366]/10">
                            <Info className="w-5 h-5 text-[#002366] shrink-0 fill-[#002366]/10" />
                            <div className="text-xs text-[#001030] leading-relaxed">
                                <span className="font-bold text-[#002366] block mb-0.5">Note importante</span>
                                Lors de la validation, un <i>lien d'activation</i> sera automatiquement envoyé à l'adresse email renseignée ci-dessus pour permettre au membre de définir son mot de passe.
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#002366] text-white rounded-lg py-3.5 flex items-center justify-center font-bold text-sm shadow-sm hover:bg-[#002366]/90 transition-colors disabled:opacity-70"
                            >
                                {isSubmitting ? "Enregistrement..." : "Enregistrer le membre"}
                                {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                                className="w-full bg-white text-[#001030] rounded-lg py-3.5 flex items-center justify-center font-bold text-sm border border-black/10 hover:bg-muted/30 transition-colors disabled:opacity-70"
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer mock cards */}
                <div className="mx-4 sm:mx-0 mt-6 space-y-3 hidden sm:block">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#002366]/10 text-[#002366] flex items-center justify-center">
                            <Users className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Membres</div>
                            <div className="font-bold text-lg text-[#001030]">124</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
                            <Wallet className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cotisations</div>
                            <div className="font-bold text-lg text-[#001030]">850€ <span className="text-xs font-normal text-muted-foreground lowercase">/mois</span></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-black/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
                            <Clock className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">En Attente</div>
                            <div className="font-bold text-lg text-[#001030]">3</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
