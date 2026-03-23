export function parseFullName(
    nom: string,
    prenom: string,
    fullNameStr: string
): { firstName: string; lastName: string } {
    let firstName = String(prenom || "").trim();
    let lastName = String(nom || "").trim();
    
    // Fallback to "NOM ET PRÉNOMS COMPLETS" if NOM or PRÉNOM is empty
    if (!firstName || !lastName) {
        const fullName = String(fullNameStr || "").trim();
        if (fullName) {
            const parts = fullName.split(/\s+/);
            if (!lastName && parts.length > 0) lastName = parts[0];
            if (!firstName && parts.length > 1) firstName = parts.slice(1).join(" ");
        }
    }
    
    return { firstName, lastName };
}
