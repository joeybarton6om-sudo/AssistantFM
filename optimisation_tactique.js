"use strict";

const formationsOptimisation = [
    { id: "4231", nom: "4-2-3-1", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "dm", "amr", "amc", "aml", "stc"] },
    { id: "433", nom: "4-3-3", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "mc", "mc", "amr", "aml", "stc"] },
    { id: "442", nom: "4-4-2", positions: ["gk", "dr", "dc", "dc", "dl", "mr", "mc", "mc", "ml", "stc", "stc"] },
    { id: "352", nom: "3-5-2", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "dm", "mc", "mc", "stc", "stc"] },
    { id: "343", nom: "3-4-3", positions: ["gk", "dc", "dc", "dc", "wbr", "wbl", "mc", "mc", "amr", "aml", "stc"] },
    { id: "41212", nom: "4-1-2-1-2", positions: ["gk", "dr", "dc", "dc", "dl", "dm", "mc", "mc", "amc", "stc", "stc"] }
];

const optimisationTactique = {
    seuil: 10, formation: "", place: 0, roles: {}, candidats: false, budget: "", cache: null
};

function reinitialiserOptimisationTactique() {
    Object.assign(optimisationTactique, { seuil: 10, formation: "", place: 0, roles: {}, candidats: false, budget: "", cache: null });
}

// Affectation hongroise : chaque ligne dispose aussi d'une colonne vide pour les postes non couverts.
function affectationOptimale(matrice) {
    const n = matrice.length;
    if (!n) return [];
    const m = matrice[0].length;
    const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0);
    const p = Array(m + 1).fill(0), chemin = Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
        p[0] = i;
        let j0 = 0;
        const min = Array(m + 1).fill(Infinity), visite = Array(m + 1).fill(false);
        do {
            visite[j0] = true;
            const i0 = p[j0];
            let delta = Infinity, j1 = 0;
            for (let j = 1; j <= m; j++) {
                if (visite[j]) continue;
                const cout = -matrice[i0 - 1][j - 1] - u[i0] - v[j];
                if (cout < min[j]) { min[j] = cout; chemin[j] = j0; }
                if (min[j] < delta) { delta = min[j]; j1 = j; }
            }
            for (let j = 0; j <= m; j++) {
                if (visite[j]) { u[p[j]] += delta; v[j] -= delta; }
                else min[j] -= delta;
            }
            j0 = j1;
        } while (p[j0] !== 0);
        do {
            const j1 = chemin[j0];
            p[j0] = p[j1];
            j0 = j1;
        } while (j0 !== 0);
    }
    const resultat = Array(n).fill(-1);
    for (let j = 1; j <= m; j++) if (p[j]) resultat[p[j] - 1] = j - 1;
    return resultat;
}

function formationsDisponibles() {
    const modeles = formationsOptimisation.map(f => ({ ...f, places: f.positions.map((position, numero) => ({ position, numero })) }));
    for (const tactic of rawData.tactiques) {
        const places = (tactic.postes || []).map((slot, numero) => ({
            numero, position: positionTactique(slot.avec_ball?.[0]) || positionTactique(slot.sans_ball?.[0])
        }));
        if (places.length === 11 && places.every(slot => rolesParPoste[slot.position]?.length)) {
            modeles.push({ id: `sauvegarde:${tactic.id}`, nom: `${tactic.nom} · enregistrée`, places });
        }
    }
    return modeles;
}

function choixRoleOptimisation(player, position, rolesPermis, seuil) {
    const aptitude = player.positions?.[position];
    if (!estNombre(aptitude) || Number(aptitude) < seuil || Number(aptitude) > 20) return null;
    let meilleur = null;
    for (const roleId of rolesPermis) {
        const evaluation = donneesComparables(player, position, roles[roleId]);
        if (evaluation.score !== null && (!meilleur || evaluation.score > meilleur.score)) {
            meilleur = { player, roleId, score: evaluation.score, aptitude: evaluation.aptitude };
        }
    }
    return meilleur;
}

function calculerFormationOptimale(formation, joueurs, seuil, rolesImposes) {
    const choix = formation.places.map(place => joueurs.map(player =>
        choixRoleOptimisation(player, place.position, rolesImposes[place.numero]
            ? [rolesImposes[place.numero]] : rolesParPoste[place.position], seuil)));
    const matrice = choix.map(ligne => [
        ...ligne.map(c => c ? 1000 + c.score : -1000),
        ...Array(formation.places.length).fill(0)
    ]);
    const affectations = affectationOptimale(matrice);
    const titulaires = affectations.map((col, i) => choix[i][col] || null);
    const utilises = new Set(titulaires.filter(Boolean).map(item => String(item.player.uid)));
    const remplacants = joueurs.filter(player => !utilises.has(String(player.uid)));
    const rolesRetenus = formation.places.map((place, i) =>
        titulaires[i]?.roleId || rolesImposes[place.numero] || rolesParPoste[place.position][0]);
    const choixDoublures = formation.places.map((place, i) => remplacants.map(player =>
        choixRoleOptimisation(player, place.position, [rolesRetenus[i]], seuil)));
    const matriceDoublures = choixDoublures.map(ligne => [
        ...ligne.map(c => c ? 1000 + c.score : -1000),
        ...Array(formation.places.length).fill(0)
    ]);
    const affectationsDoublures = affectationOptimale(matriceDoublures);
    const places = formation.places.map((place, i) => ({
        ...place, roleId: rolesRetenus[i], titulaire: titulaires[i],
        doublure: choixDoublures[i][affectationsDoublures[i]] || null
    }));
    return {
        formation, places, couverts: titulaires.filter(Boolean).length,
        total: titulaires.reduce((sum, item) => sum + (item?.score || 0), 0),
        doublures: places.filter(item => item.doublure).length
    };
}

function calculerOptimisationTactique() {
    const modeles = formationsDisponibles();
    const tous = rawData.joueurs.filter(p => p.est_mon_club === true);
    const effectif = tous.filter(p => p.uid != null);
    const counts = new Map();
    effectif.forEach(p => counts.set(String(p.uid), (counts.get(String(p.uid)) || 0) + 1));
    const joueurs = effectif.filter(p => counts.get(String(p.uid)) === 1);
    const signature = JSON.stringify([optimisationTactique.seuil, optimisationTactique.roles, ponderationsRoles]);
    if (optimisationTactique.cache?.data === rawData && optimisationTactique.cache.signature === signature) return optimisationTactique.cache;
    const resultats = modeles.map(formation => calculerFormationOptimale(
        formation, joueurs, optimisationTactique.seuil, optimisationTactique.roles[formation.id] || {}
    )).sort((a, b) => b.couverts - a.couverts || b.total - a.total || b.doublures - a.doublures);
    return optimisationTactique.cache = { data: rawData, signature, resultats, effectif: joueurs.length, exclus: tous.length - joueurs.length };
}

function ciblesOptimisation(place, budget) {
    const candidats = [];
    for (const player of rawData.joueurs) {
        if (player.est_mon_club === true || player.uid == null) continue;
        const item = choixRoleOptimisation(player, place.position, [place.roleId], optimisationTactique.seuil);
        if (!item || (place.titulaire && item.score <= place.titulaire.score)) continue;
        const cout = coutEstime(player);
        if (budget !== null && (cout === null || cout > budget)) continue;
        candidats.push({ ...item, cout });
    }
    candidats.sort((a, b) => b.score - a.score || String(a.player.nom || "").localeCompare(String(b.player.nom || ""), "fr"));
    return candidats.slice(0, 5);
}

function afficherOptimisationTactique() {
    const cible = document.getElementById("optimisation-view");
    const donnees = calculerOptimisationTactique();
    const resultats = donnees.resultats;
    if (!resultats.some(r => r.formation.id === optimisationTactique.formation)) optimisationTactique.formation = resultats[0]?.formation.id || "";
    const resultat = resultats.find(r => r.formation.id === optimisationTactique.formation);
    const places = resultat?.places || [];
    const place = places[optimisationTactique.place] || places[0];
    const options = resultats.map((r, i) => `<option value="${escapeHtml(r.formation.id)}"${r === resultat ? " selected" : ""}>${i + 1}. ${escapeHtml(r.formation.nom)} · ${r.couverts}/11 · ${r.couverts ? (r.total / r.couverts).toFixed(2) : "—"}/20</option>`).join("");
    const placement = placerPostesTerrain(places.map((slot, index) => ({ slot, index, position: slot.position })));
    const terrain = placement.places.map(({ slot, index, row, col, x }) => {
        const label = `${nomPosteTerrain(slot.position, x)} · ${roles[slot.roleId].nom} · ${slot.titulaire?.player.nom || "non couvert"} · place ${index + 1}`;
        return `<button type="button" class="compact-pitch-slot planner-marker" data-opt-place="${index}" aria-pressed="${slot === place}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="grid-row:${row};grid-column:${col}">${contenuPlaceTerrain(slot.position, roles[slot.roleId].nom, x)}</button>`;
    }).join("");
    const priorites = places.map((slot, index) => ({ slot, index })).sort((a, b) =>
        Number(Boolean(a.slot.titulaire)) - Number(Boolean(b.slot.titulaire))
        || Number(Boolean(a.slot.doublure)) - Number(Boolean(b.slot.doublure))
        || (a.slot.titulaire?.score ?? 0) - (b.slot.titulaire?.score ?? 0));
    const lignes = priorites.map(({ slot, index }) => `<tr><td><button type="button" class="profile-link" data-opt-place="${index}">${escapeHtml(nomPoste(slot.position))} · ${escapeHtml(roles[slot.roleId].nom)} · ${index + 1}</button></td>
        <td>${!slot.titulaire ? "Titulaire non couvert" : !slot.doublure ? "Doublure non couverte" : "Comparer au titulaire"}</td>
        <td>${slot.titulaire ? `${linkJoueur(slot.titulaire.player)} · ${slot.titulaire.score.toFixed(2)}/20` : "Non affecté"}</td>
        <td>${slot.doublure ? `${linkJoueur(slot.doublure.player)} · ${slot.doublure.score.toFixed(2)}/20` : "Non affectée"}</td></tr>`).join("");
    let recherche = "";
    if (optimisationTactique.candidats && place) {
        const budget = optimisationTactique.budget === "" ? null : Number(optimisationTactique.budget);
        if (budget !== null && (!Number.isFinite(budget) || budget < 0)) recherche = '<p role="alert">Le budget doit être un nombre positif ou nul.</p>';
        else {
            const joueurs = ciblesOptimisation(place, budget);
            recherche = `<p>${place.titulaire ? "Meilleurs que le titulaire affecté" : "Profils évaluables pour ce poste non couvert"} · ${joueurs.length} résultat(s) affiché(s), maximum 5.</p>
                ${joueurs.map(item => `<div class="diagnostic-candidate">${linkJoueur(item.player)} · ${item.score.toFixed(2)}/20 · aptitude ${item.aptitude}/20${place.titulaire ? ` · écart +${(item.score - place.titulaire.score).toFixed(2)}` : ""} · coût estimé ${escapeHtml(item.cout === null ? "inconnu" : formatMoney(item.cout))}</div>`).join("") || "<p>Aucun candidat ne satisfait ces critères.</p>"}`;
        }
    }
    cible.innerHTML = `<h2>Optimiseur tactique</h2>
        <p>Comparez plusieurs formations à votre effectif, examinez les rôles proposés et choisissez les postes à renforcer. La mentalité, le style et les consignes restent à définir dans FM.</p>
        <p class="caveat">Simulation locale, sans modification de FM. Ce classement mesure seulement l’adéquation individuelle poste/rôle : ce n’est ni l’efficacité tactique FM27 ni une prédiction des matchs. Compréhension, adhésion, informations sur le prochain match, consignes, complexité et charge d’entraînement ne sont pas connues dans cet export.</p>
        <div class="decision-controls"><label>Formation à examiner<select id="opt-formation">${options}</select></label>
        <label>Aptitude minimale au poste<select id="opt-seuil"><option value="10">10/20 · élargie</option><option value="15">15/20 · confirmée</option><option value="18">18/20 · naturelle</option></select></label></div>
        <p role="status">${donnees.effectif ? `${donnees.effectif} joueur(s) identifiés · ${resultat.couverts}/11 titulaires et ${resultat.doublures}/11 doublures affectés sans doublon · moyenne des titulaires évaluables ${resultat.couverts ? (resultat.total / resultat.couverts).toFixed(2) + "/20" : "indisponible"}.` : "Aucun joueur du club avec un identifiant unique : chargez une base avec votre effectif."}${donnees.exclus ? ` ${donnees.exclus} joueur(s) exclus pour identifiant absent ou dupliqué.` : ""}</p>
        <p class="caveat">Classement : couverture des titulaires d’abord, puis somme de leurs notes ; doublures en cas d’égalité. Les rôles sont choisis individuellement, sans évaluer leur équilibre collectif. Si aucun titulaire n’est affecté, le premier rôle disponible sert de point de départ modifiable. L’optimisation porte sur les six formations proposées et les tactiques enregistrées complètes reconnues, pas toutes les formations possibles. Notes calculées sur les attributs pondérés et l’aptitude au poste ; données incomplètes ou aptitude sous le seuil exclues.</p>
        <div class="rp-layout"><aside>${cadreTerrain(placement, terrain, "Places de la composition proposée")}<p>Cliquez sur une place pour examiner son rôle et ses candidats.</p></aside><div>
        ${place ? `<h3>${escapeHtml(nomPoste(place.position))} · place ${optimisationTactique.place + 1}</h3>
        <label>Rôle proposé<select id="opt-role"><option value="">Automatique · meilleur rôle individuel</option>${rolesParPoste[place.position].map(id => `<option value="${escapeHtml(id)}"${optimisationTactique.roles[resultat.formation.id]?.[place.numero] === id ? " selected" : ""}>${escapeHtml(roles[id].nom)}</option>`).join("")}</select></label>
        <p>Rôle retenu : <strong>${escapeHtml(roles[place.roleId].nom)}</strong><br>Titulaire indicatif : ${place.titulaire ? `${linkJoueur(place.titulaire.player)} · ${place.titulaire.score.toFixed(2)}/20 · aptitude ${place.titulaire.aptitude}/20` : "aucun profil évaluable au seuil choisi"}<br>Doublure indicative : ${place.doublure ? `${linkJoueur(place.doublure.player)} · ${place.doublure.score.toFixed(2)}/20` : "aucune affectée"}</p>
        <p>Attributs pondérés${place.titulaire ? " du titulaire proposé" : " recherchés"} : ${escapeHtml(roles[place.roleId].stats.filter(key => poidsRole(roles[place.roleId], key) > 0).map(key => `${nomsStats[key] || key}${place.titulaire ? ` ${place.titulaire.player.stats[key]}/20` : ""} (poids ${poidsRole(roles[place.roleId], key)})`).join(" · "))}.</p>
        <label>Budget maximal par recrue (€)<input type="number" min="0" step="1" id="opt-budget" value="${escapeHtml(optimisationTactique.budget)}" placeholder="Sans limite"></label>
        <button type="button" class="tab-btn" id="opt-chercher">Chercher des recrues pour cette place</button>
        <p class="caveat">Un budget exclut les coûts inconnus ; coût estimé, clause conditionnelle, intérêt et salaire demandé à vérifier. Les candidats ne sont pas filtrés par volonté de signer.</p>${recherche}` : ""}
        </div></div>
        <h3>Postes et rôles à examiner pour le recrutement</h3><p>En priorité : postes sans titulaire, puis sans doublure, puis notes de titulaires les plus faibles. Une doublure absente ne signifie pas absence totale de joueur polyvalent : l’affectation évite les doublons.</p>
        <div class="rp-table"><table><thead><tr><th>Place et rôle</th><th>Priorité indicative</th><th>Titulaire</th><th>Doublure</th></tr></thead><tbody>${lignes}</tbody></table></div>
        <h3>Vérifications dans FM27</h3><p>L’article officiel distingue compréhension tactique, niveau du joueur, adhésion et informations sur le prochain match. Contrôlez leurs jauges en jeu, ainsi que la complexité des consignes ; ajustez progressivement vos entraînements collectifs et individuels selon la charge et les besoins.</p>
        <p><a href="https://www.footballmanager.com/fr/fm27/features/fm27-entrainement-et-efficacite-tactique" target="_blank" rel="noopener noreferrer">Source officielle : entraînement et efficacité tactique FM27</a></p>`;
    cible.querySelector("#opt-formation").addEventListener("change", event => {
        optimisationTactique.formation = event.target.value; optimisationTactique.place = 0; optimisationTactique.candidats = false; afficherOptimisationTactique();
    });
    const seuil = cible.querySelector("#opt-seuil");
    seuil.value = String(optimisationTactique.seuil);
    seuil.addEventListener("change", () => { optimisationTactique.seuil = Number(seuil.value); optimisationTactique.candidats = false; afficherOptimisationTactique(); });
    cible.querySelectorAll("[data-opt-place]").forEach(button => button.addEventListener("click", () => {
        optimisationTactique.place = Number(button.dataset.optPlace); optimisationTactique.candidats = false; afficherOptimisationTactique();
        cible.querySelector(`.planner-marker[data-opt-place="${optimisationTactique.place}"]`)?.focus();
    }));
    if (place) {
        cible.querySelector("#opt-role").addEventListener("change", event => {
            const choix = optimisationTactique.roles[resultat.formation.id] || (optimisationTactique.roles[resultat.formation.id] = {});
            if (event.target.value) choix[place.numero] = event.target.value;
            else delete choix[place.numero];
            optimisationTactique.candidats = false; afficherOptimisationTactique();
        });
        cible.querySelector("#opt-budget").addEventListener("input", event => { optimisationTactique.budget = event.target.value; });
        cible.querySelector("#opt-chercher").addEventListener("click", () => { optimisationTactique.candidats = true; afficherOptimisationTactique(); });
        cible.querySelectorAll('[data-profile-kind="joueur"]').forEach(button => {
            const index = button.closest("tr")?.querySelector("[data-opt-place]")?.dataset.optPlace;
            const contexte = index === undefined ? place : places[Number(index)];
            button.dataset.profilePosition = contexte.position;
            button.dataset.profileRole = contexte.roleId;
        });
    }
}
