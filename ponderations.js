let ponderationsRoles = {};
const identifiantsRoles = new Map(Object.entries(roles).map(([id, role]) => [role, id]));

function clePonderations() {
    const uid = rawData.club_gere?.uid;
    if (uid == null) throw new Error("Club géré non identifié.");
    return clePourPartie(`assistantfm-roles-v1:${uid}`);
}

function chargerPonderations() {
    ponderationsRoles = {};
    const statut = document.getElementById("alertes-status");
    try {
        const contenu = localStorage.getItem(clePonderations());
        if (!contenu) return;
        const data = JSON.parse(contenu);
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Format invalide.");
        for (const [roleId, weights] of Object.entries(data)) {
            if (!roles[roleId] || !weights || typeof weights !== "object" || Array.isArray(weights)) throw new Error("Rôle invalide.");
            for (const [key, value] of Object.entries(weights)) {
                if (!roles[roleId].stats.includes(key) || !Number.isFinite(value) || value < 0 || value > 5) throw new Error("Pondération invalide.");
            }
        }
        ponderationsRoles = data;
    } catch (error) {
        statut.textContent = `Pondérations indisponibles : ${error.message}`;
    }
}

function poidsRole(role, key) {
    const roleId = identifiantsRoles.get(role);
    return ponderationsRoles[roleId]?.[key] ?? 1;
}

function controlesPonderations(roleId) {
    const role = roles[roleId];
    if (!role) return "";
    return `<details class="profile-section profile-contract"><summary>Personnaliser les poids de ce rôle</summary>
        <p class="caveat">Poids de 0 à 5 : 0 exclut l’attribut. La note reste une estimation, pas une note officielle FM. Les attributs absents ne sont pas assimilés à zéro.</p>
        <div class="profile-controls">${role.stats.map(key => `<label>${escapeHtml(nomsStats[key] || key)}<input type="number" min="0" max="5" step="0.5" data-role-weight="${escapeHtml(key)}" value="${escapeHtml(poidsRole(role, key))}"></label>`).join("")}</div>
        <button type="button" class="tab-btn" id="sauver-ponderations">Enregistrer les poids</button>
        <button type="button" class="tab-btn" id="reset-ponderations">Poids par défaut</button>
        <p id="ponderations-status" role="status"></p></details>`;
}

function brancherPonderations(roleId) {
    const statut = document.getElementById("ponderations-status");
    const save = document.getElementById("sauver-ponderations");
    if (!save) return;
    save.addEventListener("click", () => {
        try {
            const inputs = [...document.querySelectorAll("[data-role-weight]")];
            if (inputs.some(input => !input.checkValidity() || input.value === "")) throw new Error("Les poids doivent être compris entre 0 et 5.");
            const weights = Object.fromEntries(inputs.map(input => [input.dataset.roleWeight, Number(input.value)]));
            if (!Object.values(weights).some(value => value > 0)) throw new Error("Au moins un poids doit être positif.");
            const next = { ...ponderationsRoles, [roleId]: weights };
            localStorage.setItem(clePonderations(), JSON.stringify(next));
            ponderationsRoles = next;
            if (mode === "recrutement-poste") afficherRecrutementPoste();
            if (mode === "optimisation") afficherOptimisationTactique();
            refreshPop();
            document.querySelector("#modal-body details:last-of-type").open = true;
            document.getElementById("ponderations-status").textContent = "Pondérations enregistrées.";
        } catch (error) { statut.textContent = `Enregistrement impossible : ${error.message}`; }
    });
    document.getElementById("reset-ponderations").addEventListener("click", () => {
        try {
            const next = { ...ponderationsRoles };
            delete next[roleId];
            localStorage.setItem(clePonderations(), JSON.stringify(next));
            ponderationsRoles = next;
            if (mode === "recrutement-poste") afficherRecrutementPoste();
            if (mode === "optimisation") afficherOptimisationTactique();
            refreshPop();
            document.querySelector("#modal-body details:last-of-type").open = true;
            document.getElementById("ponderations-status").textContent = "Poids par défaut restaurés.";
        } catch (error) { statut.textContent = `Réinitialisation impossible : ${error.message}`; }
    });
}
