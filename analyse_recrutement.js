let similaireReference = null;
let similairePosition = "";
let similaireRole = "";

function explicationRecrutement(player, position, roleId) {
    const role = roles[roleId];
    if (!role || !position) return "";
    const benchmark = joueursAuPoste(position)
        .map(joueur => ({ joueur, score: noteRole(joueur, role, position) }))
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score)[0];
    const score = noteRole(player, role, position);
    const pairs = role.stats.filter(key => estNombre(player.stats?.[key]))
        .map(key => ({ key, valeur: Number(player.stats[key]),
            ecart: estNombre(benchmark?.joueur.stats?.[key])
                ? Number(player.stats[key]) - Number(benchmark.joueur.stats[key]) : null }));
    const forts = [...pairs].sort((a, b) => b.valeur - a.valeur).slice(0, 3);
    const faibles = [...pairs].sort((a, b) => a.valeur - b.valeur).slice(0, 3);
    const liste = items => items.length
        ? items.map(item => `${escapeHtml(nomsStats[item.key] || item.key)} ${item.valeur}/20`).join(" · ")
        : "Attributs indisponibles";
    const comparaison = benchmark && Number.isFinite(score)
        ? `${linkJoueur(benchmark.joueur)} : ${benchmark.score.toFixed(1)}/20 ; écart ${score - benchmark.score >= 0 ? "+" : ""}${(score - benchmark.score).toFixed(1)}`
        : "Aucun joueur de votre effectif évaluable à ce poste.";
    const ecarts = pairs.filter(item => item.ecart !== null).sort((a, b) => b.ecart - a.ecart);
    const detail = ecarts.length ? `Écart d’attributs vs référence : ${ecarts.map(item =>
        `${escapeHtml(nomsStats[item.key] || item.key)} ${item.ecart >= 0 ? "+" : ""}${item.ecart}`
    ).join(" · ")}` : "Pas assez d’attributs communs pour comparer.";
    const budget = valeurBudgetTransfert();
    const cost = coutEstime(player);
    const financial = cost === null ? "coût non estimable"
        : budget === "" ? `coût estimé ${formatMoney(cost)}, budget non renseigné`
        : `coût estimé ${formatMoney(cost)} · ${cost <= Number(budget) ? "dans le budget indicatif" : "hors budget indicatif"}`;
    const reputation = estNombre(player.reputation) && estNombre(rawData.club_gere?.reputation)
        ? `réputation joueur ${player.reputation}, club ${rawData.club_gere.reputation}, marge choisie ${document.getElementById("marge-reputation").value}`
        : "réputation indisponible pour la comparaison";
    return `<section class="profile-section profile-contract"><h3>Analyse de recrutement · ${escapeHtml(nomPoste(position))} / ${escapeHtml(role.nom)}</h3>
        <p>Note indicative du rôle : ${Number.isFinite(score) ? `${score.toFixed(1)}/20` : "indisponible"} · ${pairs.length}/${role.stats.length} attributs disponibles.</p>
        <p><strong>Points forts relatifs au profil :</strong> ${liste(forts)}<br><strong>Points à examiner :</strong> ${liste(faibles)}</p>
        <p><strong>Meilleur joueur de votre effectif à ce poste :</strong> ${comparaison}<br>${detail}</p>
        <p><strong>Critères à examiner :</strong> ${joueurAuPoste(player, position) ? "poste renseigné" : "poste non renseigné"} · ${escapeHtml(financial)} · ${escapeHtml(reputation)}.</p>
        <p class="caveat">Note indicative calculée à partir des attributs disponibles et du poste, pas une note officielle FM. Le prix demandé et l’intérêt du joueur restent inconnus.</p>
        <button type="button" id="find-similar">Chercher des profils similaires</button></section>`;
}

function afficherDiagnostic() {
    const target = document.getElementById("diagnostic-view");
    const tactic = rawData.tactiques.find(item => String(item.id) === document.getElementById("tactique-select").value);
    const options = rawData.tactiques.map(item =>
        `<option value="${escapeHtml(item.id)}"${tactic && item.id === tactic.id ? " selected" : ""}>${escapeHtml(item.nom)}</option>`
    ).join("");
    let html = `<h2>Diagnostic de l’effectif</h2><label>Tactique analysée<select id="diagnostic-tactic"><option value="">Choisir une tactique</option>${options}</select></label>
        <p class="caveat">Profondeur indicative : un titulaire et une doublure par place tactique ; les joueurs retenus ont une position naturelle ou une aptitude au poste supérieure à 1/20. Un joueur polyvalent peut être compté à plusieurs postes ou rôles : ce n’est pas une affectation simultanée. Notes et coûts estimés, intérêt et prix demandé inconnus. Le budget et la marge de réputation sont réglables dans « Recrutement » &gt; « Joueurs ».</p>`;
    if (!tactic) {
        target.innerHTML = `${html}<p>Choisissez la tactique utilisée en jeu pour analyser votre effectif.</p>`;
    } else {
        const groups = groupesTactiques(tactic, "avec");
        const cards = [...groups.values()].flatMap(group => group.roleIds.map(roleId => {
            const role = roles[roleId];
            if (!role) return null;
            const recommendations = joueursRecommandesPourPoste(group.position, role, 3, true);
            const slotCount = group.slots.filter(slot => slot.roleId === roleId).length;
            const required = slotCount * 2;
            const shortage = Math.max(0, required - recommendations.currentRatings.length);
            const best = recommendations.currentRatings[0];
            const candidates = recommendations.candidates.map(item => carteJoueur(item.player,
                `${item.score.toFixed(1)}/20 · ${item.reason}${best ? ` · écart ${item.score - best.score >= 0 ? "+" : ""}${(item.score - best.score).toFixed(1)} vs référence` : ""}`
            )).join("") || "<p>Aucun candidat estimable avec les critères de budget et de réputation.</p>";
            return { shortage, html: `<article class="dashboard-card diagnostic-card"><div class="diagnostic-card-heading"><div><h3>${escapeHtml(nomPoste(group.position))}</h3><span>${escapeHtml(role.nom)}</span></div><strong class="diagnostic-status${shortage ? " shortage" : ""}">${shortage ? `Manque ${shortage}` : "Couvert"}</strong></div>
                <p>${slotCount} place(s) · ${recommendations.currentRatings.length} joueur(s) évaluable(s) / ${required} souhaités</p>
                <p><span class="diagnostic-label">Meilleur actuel</span><br>${best ? `${linkJoueur(best.player)} · ${best.score.toFixed(1)}/20${modeDecouverte ? "" : ` · CA ${escapeHtml(best.player.ca ?? "—")}`}` : "non évaluable"}</p>
                <button type="button" class="tab-btn" data-diagnostic-recruter="${escapeHtml(group.position)}" data-diagnostic-role="${escapeHtml(roleId)}">Chercher pour ce poste</button>
                <details><summary>Candidats à examiner (${recommendations.candidates.length})</summary>${candidates}</details>
                ${(() => { try { return panneauBesoin(group.position, roleId); } catch (error) { return `<p role="status">Fiche de besoin indisponible : ${escapeHtml(error.message)}</p>`; } })()}</article>` };
        })).filter(Boolean).sort((a, b) => b.shortage - a.shortage);
        target.innerHTML = `${html}<div class="diagnostic-grid">${cards.map(card => card.html).join("") || "<p>Aucun poste reconnu.</p>"}</div>`;
    }
    document.getElementById("diagnostic-tactic").addEventListener("change", event => {
        document.getElementById("tactique-select").value = event.target.value;
        afficherTactiqueDetail();
        afficherDiagnostic();
    });
    target.querySelectorAll("[data-diagnostic-recruter]").forEach(button => button.addEventListener("click", () => {
        ouvrirRecrutementDepuisDiagnostic(button.dataset.diagnosticRecruter, button.dataset.diagnosticRole);
    }));
    monterBesoins(target);
}

function ouvrirSimilaires(player, position, roleId) {
    similaireReference = player;
    similairePosition = position;
    similaireRole = roleId;
    fermerBulle();
    changerOnglet("similaires");
}

function afficherSimilaires() {
    const target = document.getElementById("similaires-view");
    const reference = similaireReference;
    const role = roles[similaireRole];
    if (!reference || !role || !similairePosition) {
        target.innerHTML = "<h2>Joueurs similaires</h2><p>Ouvrez une fiche joueur, choisissez son poste et son rôle, puis cliquez sur « Chercher des profils similaires ».</p>";
        return;
    }
    target.innerHTML = `<h2>Joueurs similaires</h2><p>Référence : ${linkJoueur(reference)} · ${escapeHtml(nomPoste(similairePosition))} · ${escapeHtml(role.nom)}</p>
        <p class="caveat">Similarité des attributs actuels du rôle : 100 % signifie des attributs identiques, pas un niveau ou un potentiel identique. Les profils incomplets sont exclus. Le poste doit être naturel ou avoir une aptitude supérieure à 1/20 ; l’intérêt et le prix demandé restent inconnus.</p>
        <div class="filter-bar"><label><input id="similar-younger" type="checkbox"> Plus jeune</label><label><input id="similar-cheaper" type="checkbox"> Valeur marchande inférieure</label></div>
        <div id="similar-results"></div>`;
    const update = () => {
        const result = document.getElementById("similar-results");
        const attributes = role.stats;
        const valid = value => estNombre(value) && Number(value) >= 1 && Number(value) <= 20;
        if (!attributes.every(key => valid(reference.stats?.[key]))) {
            result.textContent = "Les attributs du rôle sont incomplets pour le joueur de référence.";
            return;
        }
        const younger = document.getElementById("similar-younger").checked;
        const cheaper = document.getElementById("similar-cheaper").checked;
        if ((younger && !estNombre(reference.age)) || (cheaper && !estNombre(reference.valeur_marchande))) {
            result.textContent = "Âge ou valeur marchande de la référence indisponible pour le filtre choisi.";
            return;
        }
        const results = rawData.joueurs.filter(player => player !== reference
            && String(player.uid) !== String(reference.uid) && joueurAuPoste(player, similairePosition)
            && (!younger || (estNombre(player.age) && Number(player.age) < Number(reference.age)))
            && (!cheaper || (estNombre(player.valeur_marchande) && Number(player.valeur_marchande) < Number(reference.valeur_marchande)))
            && attributes.every(key => valid(player.stats?.[key])))
            .map(player => ({ player, score: 100 * (1 - attributes.reduce((sum, key) =>
                sum + Math.abs(Number(player.stats[key]) - Number(reference.stats[key])), 0) / (19 * attributes.length)) }))
            .sort((a, b) => b.score - a.score || String(a.player.nom).localeCompare(String(b.player.nom), "fr"));
        result.innerHTML = `<p>${results.length} profil(s) comparables · 30 premiers affichés.</p>${results.slice(0, 30)
            .map(item => carteJoueur(item.player, `Similarité : ${item.score.toFixed(1)} % · valeur marchande : ${formatMoney(item.player.valeur_marchande)}`)).join("")
            || "<p>Aucun profil ne correspond.</p>"}`;
    };
    target.querySelectorAll("input").forEach(input => input.addEventListener("change", update));
    update();
}
