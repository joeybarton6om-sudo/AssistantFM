"use strict";

function cleOutilsPersistants() {
    if (!profilPartie()) throw new Error("Nommez votre partie dans le panneau latéral pour utiliser les fiches et scénarios.");
    const id = rawData.club_gere?.unique_id;
    if (!/^\d+$/.test(String(id ?? ""))) throw new Error("Identifiant stable du club indisponible.");
    return clePourPartie(`assistantfm-outils-v1:${id}`);
}

function validerOutilsPersistants(data) {
    const texte = (value, max) => typeof value === "string" && value.length <= max;
    const refValide = ref => ref && /^\d+$/.test(ref.id) && texte(ref.nom, 200) && ref.nom.length > 0;
    if (!data || data.version !== 1 || !Array.isArray(data.besoins) || !Array.isArray(data.scenarios)
        || data.besoins.length > 200 || data.scenarios.length > 100
        || data.besoins.some(b => !b || !texte(b.position, 30) || !rolesParPoste[b.position]?.includes(b.role)
            || !["haute", "moyenne", "basse"].includes(b.priorite) || !texte(b.profil, 500)
            || !texte(b.budget, 16) || (b.budget !== "" && (!/^\d+$/.test(b.budget) || !Number.isSafeInteger(Number(b.budget))))
            || !Array.isArray(b.cibles) || b.cibles.length > 30 || b.cibles.some(ref => !refValide(ref))
            || new Set(b.cibles.map(ref => ref.id)).size !== b.cibles.length)
        || new Set(data.besoins.map(b => `${b.position}:${b.role}`)).size !== data.besoins.length
        || data.scenarios.some(s => !s || !texte(s.nom, 80) || !s.nom.trim()
            || !["tactique", "mercato"].includes(s.type) || !texte(s.tactique, 100)
            || !Array.isArray(s.places) || s.places.length > 30
            || s.places.some(p => !p || !texte(p.numero, 30) || !texte(p.position, 30)
                || !rolesParPoste[p.position]?.includes(p.role) || !(p.joueur === null || refValide(p.joueur))
                || ![p.avec, p.sans].every(a => Array.isArray(a) && a.length <= 30 && a.every(x => texte(x, 100)))
                || !texte(p.frais, 16) || !texte(p.salaire, 16)
                || [p.frais, p.salaire].some(x => x !== "" && (!/^\d+$/.test(x) || !Number.isSafeInteger(Number(x)))))
            || new Set(s.places.map(p => p.numero)).size !== s.places.length
            || !["immediat", "jeune", "budget", ""].includes(s.profil)
            || !["equilibre", "titulaire", "profondeur", ""].includes(s.objectif)
            || (s.type === "mercato" && (!s.profil || !s.objectif || !s.places.some(p => p.joueur)))
            || new Set(s.places.filter(p => p.joueur).map(p => p.joueur.id)).size !== s.places.filter(p => p.joueur).length
            || !Array.isArray(s.montants) || s.montants.length !== 3
            || s.montants.some(x => !texte(x, 16) || (x !== "" && (!/^\d+$/.test(x) || !Number.isSafeInteger(Number(x))))))
        || new Set(data.scenarios.map(s => `${s.type}:${s.nom}`)).size !== data.scenarios.length) {
        throw new Error("Fiches ou scénarios locaux invalides ; données inchangées.");
    }
}

function lireOutilsPersistants() {
    const texte = localStorage.getItem(cleOutilsPersistants());
    const data = texte ? JSON.parse(texte) : { version: 1, besoins: [], scenarios: [] };
    validerOutilsPersistants(data);
    return data;
}

function ecrireOutilsPersistants(data) {
    validerOutilsPersistants(data);
    localStorage.setItem(cleOutilsPersistants(), JSON.stringify(data));
}

function referenceStableOutil(joueur) {
    const id = String(joueur?.unique_id ?? "");
    if (!/^\d+$/.test(id) || !joueur.nom || rawData.joueurs.filter(p => String(p.unique_id ?? "") === id).length !== 1) {
        throw new Error(`Identité stable indisponible ou ambiguë : ${joueur?.nom || "joueur"}.`);
    }
    return { id, nom: String(joueur.nom) };
}

function resoudreOutil(ref) {
    const matchs = rawData.joueurs.filter(p => String(p.unique_id ?? "") === ref.id && p.nom === ref.nom);
    if (matchs.length !== 1) throw new Error(`Joueur absent ou ambigu dans cette extraction : ${ref.nom}.`);
    return matchs[0];
}

function panneauBesoin(position, role) {
    const data = lireOutilsPersistants();
    const besoin = data.besoins.find(b => b.position === position && b.role === role)
        || { position, role, priorite: "moyenne", profil: "", budget: "", cibles: [] };
    const suivis = AssistantFMSuivi.liste().filter(item => item.joueur && item.joueur.est_mon_club !== true);
    const options = suivis.map(item => {
        const joueur = item.joueur;
        const id = String(joueur.unique_id ?? "");
        return `<option value="${escapeHtml(id)}"${besoin.cibles.some(ref => ref.id === id) ? " selected" : ""}>${escapeHtml(joueur.nom)}</option>`;
    }).join("");
    const absents = besoin.cibles.filter(ref => !suivis.some(item => String(item.joueur.unique_id ?? "") === ref.id));
    return `<details class="dashboard-card" data-besoin-position="${escapeHtml(position)}" data-besoin-role="${escapeHtml(role)}"><summary>Fiche de besoin</summary>
        <label>Priorité <select data-besoin-priorite>${["haute", "moyenne", "basse"].map(p => `<option value="${p}"${besoin.priorite === p ? " selected" : ""}>${p}</option>`).join("")}</select></label>
        <label>Profil recherché <input data-besoin-profil maxlength="500" value="${escapeHtml(besoin.profil)}"></label>
        <label>Budget indicatif (€) <input data-besoin-budget type="number" min="0" step="1" value="${escapeHtml(besoin.budget)}"></label>
        <label>Cibles depuis le suivi <select data-besoin-cibles multiple size="4">${options}</select></label>
        ${absents.length ? `<p>Conservées mais absentes du suivi : ${absents.map(ref => escapeHtml(ref.nom)).join(", ")}.</p><label><input type="checkbox" data-besoin-retirer-absents> Retirer ces cibles de la fiche</label>` : ""}
        <button type="button" data-besoin-enregistrer>Enregistrer la fiche</button> <button type="button" data-besoin-supprimer>Supprimer la fiche</button>
        <p data-besoin-status role="status"></p></details>`;
}

function monterBesoins(target) {
    target.querySelectorAll("[data-besoin-position]").forEach(panel => {
        const status = panel.querySelector("[data-besoin-status]");
        const position = panel.dataset.besoinPosition, role = panel.dataset.besoinRole;
        panel.querySelector("[data-besoin-enregistrer]").addEventListener("click", () => {
            try {
                const data = lireOutilsPersistants();
                const ancien = data.besoins.find(b => b.position === position && b.role === role);
                const suivis = AssistantFMSuivi.liste().filter(item => item.joueur && item.joueur.est_mon_club !== true);
                const ids = [...panel.querySelector("[data-besoin-cibles]").selectedOptions].map(option => option.value);
                const cibles = ids.map(id => {
                    const correspondants = suivis.filter(item => String(item.joueur.unique_id ?? "") === id);
                    if (correspondants.length !== 1) throw new Error("Cible suivie absente ou ambiguë.");
                    return referenceStableOutil(correspondants[0].joueur);
                });
                const absents = panel.querySelector("[data-besoin-retirer-absents]")?.checked ? []
                    : (ancien?.cibles || []).filter(ref => !suivis.some(item => String(item.joueur.unique_id ?? "") === ref.id));
                data.besoins = data.besoins.filter(b => b.position !== position || b.role !== role);
                data.besoins.push({ position, role, priorite: panel.querySelector("[data-besoin-priorite]").value,
                    profil: panel.querySelector("[data-besoin-profil]").value, budget: panel.querySelector("[data-besoin-budget]").value,
                    cibles: [...cibles, ...absents] });
                ecrireOutilsPersistants(data);
                status.textContent = "Fiche enregistrée dans ce navigateur.";
            } catch (error) { status.textContent = `Enregistrement impossible : ${error.message}`; }
        });
        panel.querySelector("[data-besoin-supprimer]").addEventListener("click", () => {
            try {
                const data = lireOutilsPersistants();
                data.besoins = data.besoins.filter(b => b.position !== position || b.role !== role);
                ecrireOutilsPersistants(data);
                afficherDiagnostic();
            } catch (error) { status.textContent = `Suppression impossible : ${error.message}`; }
        });
    });
}

function panneauScenarios(type) {
    try {
        const scenarios = lireOutilsPersistants().scenarios.filter(item => item.type === type);
        return `<div class="dashboard-card"><h3>Scénarios enregistrés</h3>
            <p class="caveat">Locaux à cette partie et ce club, exportables avec les données personnelles. Ils ne modifient pas FM.</p>
            <label>Nom du scénario <input data-scenario-nom maxlength="80"></label>
            <button type="button" data-scenario-save>Enregistrer le scénario courant</button>
            <label>Scénario <select data-scenario-select><option value="">Choisir</option>${scenarios.map(s => `<option value="${escapeHtml(s.nom)}">${escapeHtml(s.nom)}</option>`).join("")}</select></label>
            <button type="button" data-scenario-restore>Réappliquer</button> <button type="button" data-scenario-delete>Supprimer</button>
            <p data-scenario-status role="status"></p></div>`;
    } catch (error) { return `<p role="status">Scénarios indisponibles : ${escapeHtml(error.message)}</p>`; }
}

function capturerScenario(type, nom) {
    if (!nom.trim()) throw new Error("Donnez un nom au scénario.");
    if (type === "tactique") {
        if (!labo) throw new Error("Choisissez une tactique dans le laboratoire.");
        const places = labo.postes.map(slot => {
            const position = positionTactique(slot.avec_ball?.[0]) || positionTactique(slot.sans_ball?.[0]);
            if (!rolesParPoste[position]) throw new Error("Une place n'a pas de poste reconnu ; scénario non enregistré.");
            const role = rolesParPoste[position].includes(labo.roles[slot.numero]) ? labo.roles[slot.numero] : rolesParPoste[position][0];
            const uid = labo.titulaires[slot.numero];
            const matchs = uid == null ? [] : rawData.joueurs.filter(p => p.est_mon_club && String(p.uid) === String(uid));
            if (uid != null && matchs.length !== 1) throw new Error("Titulaire absent ou ambigu.");
            return { numero: String(slot.numero), position, role, joueur: uid == null ? null : referenceStableOutil(matchs[0]),
                avec: (slot.avec_ball || []).map(String), sans: (slot.sans_ball || []).map(String), frais: "", salaire: "" };
        });
        return { nom: nom.trim(), type, tactique: String(labo.source), places, profil: "", objectif: "", montants: ["", "", ""] };
    }
    const tactic = tactiqueSelectionnee();
    if (!tactic) throw new Error("Choisissez une tactique.");
    const repartition = repartirEffectif(tactic, rawData.joueurs.filter(p => p.est_mon_club === true));
    const places = repartition.map((slot, index) => {
        const choix = mercatoChoix[index] || {};
        const matchs = choix.id ? rawData.joueurs.filter(p => String(p.uid) === String(choix.id) && p.est_mon_club !== true) : [];
        if (choix.id && matchs.length !== 1) throw new Error("Cible absente ou ambiguë.");
        return { numero: String(slot.numero), position: slot.position, role: slot.roleId,
            joueur: choix.id ? referenceStableOutil(matchs[0]) : null, avec: [], sans: [],
            frais: choix.id ? String(choix.frais ?? "") : "", salaire: choix.id ? String(choix.salaire ?? "") : "" };
    });
    const cibles = places.filter(p => p.joueur);
    if (!cibles.length) throw new Error("Sélectionnez au moins une cible.");
    if (new Set(cibles.map(p => p.joueur.id)).size !== cibles.length) throw new Error("Une cible est sélectionnée plusieurs fois.");
    return { nom: nom.trim(), type, tactique: String(tactic.id), places, profil: mercatoProfil, objectif: mercatoObjectif,
        montants: [mercatoMontants.budget, mercatoMontants.ventes, mercatoMontants.economie].map(v => String(v ?? "")) };
}

function appliquerScenario(s) {
    const base = rawData.tactiques.find(t => String(t.id) === s.tactique);
    if (!base) throw new Error("La tactique d'origine est absente de cette extraction.");
    const ids = new Set((base.postes || []).map(slot => String(slot.numero)));
    if (s.places.some(p => !ids.has(p.numero))) throw new Error("Une place tactique n'existe plus.");
    const joueurs = s.places.map(p => p.joueur ? resoudreOutil(p.joueur) : null);
    if (s.type === "tactique") {
        if (s.places.length !== ids.size || joueurs.some(p => p && p.est_mon_club !== true)) throw new Error("L'effectif ou les places tactiques ont changé.");
        if (joueurs.some((player, i) => player && (!joueurAuPoste(player, s.places[i].position)
            || !Number.isFinite(noteRole(player, roles[s.places[i].role], s.places[i].position))))) {
            throw new Error("Un titulaire n'est plus évaluable au poste enregistré.");
        }
        const postes = (base.postes || []).map(slot => {
            const place = s.places.find(p => p.numero === String(slot.numero));
            if (!place) throw new Error("Place tactique manquante.");
            if ((positionTactique(place.avec[0]) || positionTactique(place.sans[0])) !== place.position) throw new Error("Poste enregistré incohérent.");
            return { ...slot, avec_ball: [...place.avec], sans_ball: [...place.sans] };
        });
        labo = { source: base.id, postes, roles: Object.fromEntries(s.places.map(p => [p.numero, p.role])),
            titulaires: Object.fromEntries(s.places.flatMap((p, i) => joueurs[i] ? [[p.numero, joueurs[i].uid]] : [])), place: null };
        afficherLaboratoire();
    } else {
        if (joueurs.some(p => p && p.est_mon_club === true)) throw new Error("Une cible ne fait plus partie du marché externe.");
        const slots = [...groupesTactiques(base, "avec").values()].flatMap(group => group.slots.filter(slot => roles[slot.roleId]));
        if (slots.length !== s.places.length) throw new Error("Les places de la tactique ont changé.");
        const choix = {};
        s.places.forEach((place, i) => {
            const index = slots.findIndex(slot => String(slot.numero) === place.numero && slot.position === place.position);
            if (index < 0) throw new Error("Le poste d'une place a changé ; scénario non appliqué.");
            if (joueurs[i]) choix[index] = { id: String(joueurs[i].uid), frais: place.frais, salaire: place.salaire };
        });
        tacticalRoles[base.id] = Object.fromEntries(s.places.map(place => [place.numero, place.role]));
        document.getElementById("tactique-select").value = s.tactique;
        mercatoTactique = s.tactique;
        mercatoProfil = s.profil;
        mercatoObjectif = s.objectif;
        [mercatoMontants.budget, mercatoMontants.ventes, mercatoMontants.economie] = s.montants;
        mercatoChoix = choix;
        afficherMercato();
    }
}

function monterScenarios(target, type) {
    const save = target.querySelector("[data-scenario-save]");
    if (!save) return;
    const status = target.querySelector("[data-scenario-status]");
    save.addEventListener("click", () => {
        try {
            const scenario = capturerScenario(type, target.querySelector("[data-scenario-nom]").value);
            const data = lireOutilsPersistants();
            if (data.scenarios.some(s => s.type === type && s.nom === scenario.nom)) throw new Error("Ce nom existe déjà ; supprimez-le d'abord ou choisissez un autre nom.");
            data.scenarios.push(scenario);
            ecrireOutilsPersistants(data);
            type === "tactique" ? afficherLaboratoire() : afficherMercato();
            target.querySelector("[data-scenario-status]").textContent = "Scénario enregistré.";
        } catch (error) { status.textContent = `Enregistrement impossible : ${error.message}`; }
    });
    target.querySelector("[data-scenario-restore]").addEventListener("click", () => {
        try {
            const nom = target.querySelector("[data-scenario-select]").value;
            const scenario = lireOutilsPersistants().scenarios.find(s => s.type === type && s.nom === nom);
            if (!scenario) throw new Error("Choisissez un scénario.");
            appliquerScenario(scenario);
            target.querySelector("[data-scenario-status]").textContent = "Scénario réappliqué.";
        } catch (error) { status.textContent = `Application impossible : ${error.message}`; }
    });
    target.querySelector("[data-scenario-delete]").addEventListener("click", () => {
        try {
            const nom = target.querySelector("[data-scenario-select]").value;
            const data = lireOutilsPersistants();
            if (!data.scenarios.some(s => s.type === type && s.nom === nom)) throw new Error("Choisissez un scénario.");
            data.scenarios = data.scenarios.filter(s => s.type !== type || s.nom !== nom);
            ecrireOutilsPersistants(data);
            type === "tactique" ? afficherLaboratoire() : afficherMercato();
            target.querySelector("[data-scenario-status]").textContent = "Scénario supprimé.";
        } catch (error) { status.textContent = `Suppression impossible : ${error.message}`; }
    });
}
