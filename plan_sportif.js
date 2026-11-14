let scenarioAjouts = new Set();
let scenarioDeparts = new Set();
let planPosteSelectionne = null;
let planTousPostes = false;

function reinitialiserScenario() {
    scenarioAjouts = new Set();
    scenarioDeparts = new Set();
    planPosteSelectionne = null;
    planTousPostes = false;
}

function scenarioJoueurs() {
    return rawData.joueurs.filter(player => {
        const id = String(player.uid);
        return (player.est_mon_club === true && !scenarioDeparts.has(id))
            || (player.est_mon_club !== true && scenarioAjouts.has(id));
    });
}

function repartirEffectif(tactic, joueurs, titulairesImposes = {}) {
    const postesTactiques = [...groupesTactiques(tactic, "avec").values()]
        .flatMap(group => group.slots.filter(slot => roles[slot.roleId])
            .map(slot => ({ position: group.position, roleId: slot.roleId, numero: slot.numero })));
    const resultat = postesTactiques.map(slot => ({ ...slot, titulaire: null, doublure: null }));
    const places = ["titulaire", "doublure"].flatMap(niveau =>
        resultat.map((slot, index) => ({ slot, index, niveau })));
    const candidates = places.map(({ slot }) => joueurs.map(player => ({
            player, score: noteRole(player, roles[slot.roleId], slot.position)
        })).filter(item => item.player.uid != null
            && joueurAuPoste(item.player, slot.position) && Number.isFinite(item.score))
            .sort((a, b) => b.score - a.score));
    const owner = new Map();
    const assignments = new Map();
    const verrouilles = new Set();
    places.forEach(({ slot, niveau }, index) => {
        if (niveau !== "titulaire" || titulairesImposes[slot.numero] == null) return;
        const candidate = candidates[index].find(item => String(item.player.uid) === String(titulairesImposes[slot.numero]));
        if (!candidate || owner.has(String(candidate.player.uid))) return;
        owner.set(String(candidate.player.uid), index);
        assignments.set(index, candidate);
        verrouilles.add(index);
    });
    function affecter(index, visites) {
        for (const candidate of candidates[index]) {
            const id = String(candidate.player.uid);
            if (visites.has(id)) continue;
            visites.add(id);
            const previous = owner.get(id);
            if (previous === undefined || (!verrouilles.has(previous) && affecter(previous, visites))) {
                owner.set(id, index);
                assignments.set(index, candidate);
                return true;
            }
        }
        return false;
    }
    for (const niveau of ["titulaire", "doublure"]) {
        const order = places.map((place, index) => ({ place, index }))
            .filter(item => item.place.niveau === niveau && !verrouilles.has(item.index)).map(item => item.index)
            .sort((a, b) => candidates[a].length - candidates[b].length);
        order.forEach(index => affecter(index, new Set()));
    }
    for (const [index, item] of assignments) resultat[places[index].index][places[index].niveau] = item;
    return resultat;
}

function afficherPlanSportif() {
    const target = document.getElementById("planner-view");
    const scenarioOuvert = target.querySelector("#plan-scenario")?.open || false;
    const tactic = rawData.tactiques.find(item => String(item.id) === document.getElementById("tactique-select").value);
    const options = rawData.tactiques.map(item =>
        `<option value="${escapeHtml(item.id)}"${tactic === item ? " selected" : ""}>${escapeHtml(item.nom)}</option>`).join("");
    const own = rawData.joueurs.filter(player => player.est_mon_club === true && player.uid != null);
    let cibles = [];
    let suiviErreur = "";
    try { cibles = AssistantFMSuivi.liste().map(item => item.joueur).filter(player => player && player.est_mon_club !== true && player.uid != null); }
    catch (error) { suiviErreur = error.message; }
    const optionsJoueurs = (players, selection) => players.map(player =>
        `<option value="${escapeHtml(player.uid)}">${escapeHtml(player.nom)}${selection.has(String(player.uid)) ? " · sélectionné (cliquer pour annuler)" : ""}</option>`).join("");
    const composition = tactic ? repartirEffectif(tactic, scenarioJoueurs()) : [];
    if (!composition.some(slot => String(slot.numero) === String(planPosteSelectionne))) {
        planPosteSelectionne = composition[0]?.numero ?? null;
    }
    const placement = placerPostesTerrain(composition.map(slot => ({ slot, position: slot.position })));
    const markers = placement.places.map(({ slot, row, col, x }) => {
        const selected = !planTousPostes && String(slot.numero) === String(planPosteSelectionne);
        const role = roles[slot.roleId].nom;
        const joueur = slot.titulaire;
        const nom = joueur ? joueur.player.nom || "Joueur" : "Non attribué";
        const label = `${nomPosteTerrain(slot.position, x)} · ${role} · ${nom} · place ${slot.numero}`;
        return `<button type="button" class="compact-pitch-slot planner-marker" data-plan-poste="${escapeHtml(slot.numero)}" data-position="${escapeHtml(slot.position)}" style="grid-row:${row};grid-column:${col}" aria-pressed="${selected}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${
            contenuPlaceTerrain(slot.position, role, x)
        }</button>`;
    }).join("");
    const rows = slot => {
        const joueurs = [["Titulaire", slot.titulaire], ["Doublure", slot.doublure]];
        return joueurs.map(([niveau, item]) => {
            if (!item) return `<tr><td>${niveau}</td><td colspan="6">Poste non couvert dans la répartition</td></tr>`;
            const player = item.player;
            const salary = estNombre(player.salaire_hebdomadaire) ? `${formatMoney(player.salaire_hebdomadaire)} / sem.` : "—";
            return `<tr><td>${niveau}</td><td>${linkJoueur(player)}${scenarioAjouts.has(String(player.uid)) ? ' <small>· arrivée simulée</small>' : ""}</td><td>${escapeHtml(traduireStatutEffectif(player.statut_effectif))}</td><td>${escapeHtml(salary)}</td><td>${escapeHtml(player.fin_contrat || "—")}</td><td>${escapeHtml(formatMoney(player.valeur_marchande))}</td><td>${etoiles(item.score)} ${item.score.toFixed(1)}/20</td></tr>`;
        }).join("");
    };
    const visible = planTousPostes ? composition : composition.filter(slot => String(slot.numero) === String(planPosteSelectionne));
    const tables = visible.map(slot => `<section class="planner-position-table"><h3>${escapeHtml(nomPoste(slot.position))} · ${escapeHtml(roles[slot.roleId].nom)} <small>· place ${escapeHtml(slot.numero)}</small></h3>
        <div class="planner-table"><table><thead><tr><th>Affectation</th><th>Joueur</th><th>Statut enregistré</th><th>Salaire actuel</th><th>Fin de contrat</th><th>Valeur marchande</th><th>Rôle estimé</th></tr></thead><tbody>${rows(slot)}</tbody></table></div></section>`).join("");
    target.innerHTML = `<div class="planner-header"><h2>Planificateur d’effectif</h2><span class="planner-chip">Effectif actuel · simulation</span></div>
        <div class="planner-layout"><aside class="planner-side"><label for="plan-tactique">Tactique sélectionnée<select id="plan-tactique"><option value="">Choisir une tactique</option>${options}</select></label>
        ${cadreTerrain(placement, markers || '<p class="pitch-empty">Sélectionnez une tactique pour afficher le terrain.</p>', "Choisir une place tactique")}
        <div class="planner-positions"><button type="button" id="plan-tous-postes" aria-pressed="${planTousPostes}">Tous les postes</button></div>
        <p class="profile-disclaimer">Cliquez sur une place pour consulter son titulaire et sa doublure.</p></aside>
        <div class="planner-content"><div class="planner-info">Répartition indicative sans doublons · titulaires prioritaires · rôles choisis dans l’application, pas forcément ceux du jeu.</div>
        ${tables || "<p>Sélectionnez une tactique pour afficher la répartition.</p>"}</div></div>
        <details id="plan-scenario" class="planner-scenario"${scenarioOuvert ? " open" : ""}><summary>Simuler des arrivées et des départs</summary>
        <p class="caveat">Simulation locale temporaire, sans modification de la sauvegarde. Les titulaires peuvent être repositionnés pour couvrir les doublures. La répartition privilégie la couverture puis les notes de rôle, sans garantir le meilleur total global. Un poste est éligible s’il est naturel ou si son aptitude est supérieure à 1/20.</p>
        <div class="profile-controls"><label>Simuler un départ<select id="plan-depart"><option value="">Choisir un joueur</option>${optionsJoueurs(own, scenarioDeparts)}</select></label>
        <label>Simuler une arrivée depuis le suivi<select id="plan-arrivee"><option value="">Choisir une cible suivie</option>${optionsJoueurs(cibles, scenarioAjouts)}</select></label></div>
        ${suiviErreur ? `<p role="alert">Suivi indisponible : ${escapeHtml(suiviErreur)}</p>` : ""}
        <div class="filter-bar"><button type="button" class="tab-btn" id="plan-reset">Annuler le scénario</button></div>
        <p>Départs simulés : ${own.filter(player => scenarioDeparts.has(String(player.uid))).map(player => escapeHtml(player.nom)).join(", ") || "aucun"}<br>Arrivées simulées : ${cibles.filter(player => scenarioAjouts.has(String(player.uid))).map(player => escapeHtml(player.nom)).join(", ") || "aucune"}</p></details>`;
    document.getElementById("plan-tactique").addEventListener("change", event => {
        document.getElementById("tactique-select").value = event.target.value;
        planPosteSelectionne = null;
        planTousPostes = false;
        afficherTactiqueDetail();
        afficherPlanSportif();
    });
    target.querySelectorAll("[data-plan-poste]").forEach(button => button.addEventListener("click", () => {
        planPosteSelectionne = button.dataset.planPoste;
        planTousPostes = false;
        afficherPlanSportif();
        target.querySelector(".planner-marker[aria-pressed='true']")?.focus();
    }));
    document.getElementById("plan-tous-postes").addEventListener("click", () => {
        planTousPostes = !planTousPostes;
        afficherPlanSportif();
        document.getElementById("plan-tous-postes").focus();
    });
    document.getElementById("plan-depart").addEventListener("change", event => {
        if (event.target.value) scenarioDeparts.has(event.target.value) ? scenarioDeparts.delete(event.target.value) : scenarioDeparts.add(event.target.value);
        afficherPlanSportif();
    });
    document.getElementById("plan-arrivee").addEventListener("change", event => {
        if (event.target.value) scenarioAjouts.has(event.target.value) ? scenarioAjouts.delete(event.target.value) : scenarioAjouts.add(event.target.value);
        afficherPlanSportif();
    });
    document.getElementById("plan-reset").addEventListener("click", () => { reinitialiserScenario(); afficherPlanSportif(); });
}

function afficherActionsClub() {
    const target = document.getElementById("actions-club");
    if (!target) return;
    const tactic = rawData.tactiques.find(item => String(item.id) === document.getElementById("tactique-select").value);
    const distribution = tactic ? repartirEffectif(tactic, rawData.joueurs.filter(player => player.est_mon_club === true)) : [];
    const places = distribution.filter(item => !item.titulaire || !item.doublure).length;
    const date = dateJeuUtc(rawData.date_sauvegarde);
    const contracts = rawData.joueurs.filter(player => {
        const end = dateJeuUtc(String(player.fin_contrat || "").slice(0, 10));
        return player.est_mon_club === true && date && end && end >= date && end - date <= 183 * 86400000;
    });
    let suivi = "indisponible", nouvelles = "indisponibles", erreur = "";
    try {
        suivi = AssistantFMSuivi.liste().length;
        const alertes = lireAlertes();
        nouvelles = (alertes.derniereAlerte?.nouveaux || []).reduce((sum, item) => sum + item.ids.length, 0);
    } catch (error) { erreur = error.message; }
    target.innerHTML = `<h3>À examiner</h3><div class="dashboard-grid">
        <div class="dashboard-item">${tactic ? `${places} place(s) sans titulaire ou doublure dans la répartition indicative` : "Choisissez votre tactique"}<br><button type="button" data-action-club="planificateur">Ouvrir le planificateur</button></div>
        <div class="dashboard-item">${date ? `${contracts.length} contrat(s) à échéance sous 6 mois` : "Date de sauvegarde indisponible"}<br><button type="button" data-action-club="alertes">Voir les alertes</button></div>
        <div class="dashboard-item">${escapeHtml(suivi)} cible(s) suivie(s) · ${escapeHtml(nouvelles)} nouvelle(s) correspondance(s)<br><button type="button" data-action-club="suivi">Ouvrir le suivi</button></div></div>
        ${erreur ? `<p role="alert">Données locales indisponibles : ${escapeHtml(erreur)}</p>` : ""}`;
    target.querySelectorAll("[data-action-club]").forEach(button => button.addEventListener("click", () => changerOnglet(button.dataset.actionClub)));
}
