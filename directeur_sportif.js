"use strict";

let evolutionMessage = "";
let labo = null;
let mercatoProfil = "immediat";
let mercatoObjectif = "equilibre";
let mercatoChoix = {};
let mercatoTactique = null;
let mercatoScenarios = [];
let mercatoMontants = { budget: null, ventes: "0", economie: "0" };
let rechercheTimer = null;
let evolutionJoueur = "";
let evolutionAttribut = "";

function reinitialiserDirecteur() {
    reinitialiserRecrutementPoste();
    reinitialiserOptimisationTactique();
    labo = null;
    mercatoChoix = {};
    mercatoTactique = null;
    mercatoScenarios = [];
    mercatoMontants = { budget: null, ventes: "0", economie: "0" };
}

function cleEvolution() {
    if (!profilPartie()) throw new Error("Nommez votre partie dans le panneau latéral pour activer son historique automatique.");
    const club = rawData.club_gere;
    if (!club || !/^\d+$/.test(String(club.unique_id ?? ""))) throw new Error("Identifiant stable du club indisponible : historique désactivé.");
    return clePourPartie(`assistantfm-evolution-v1:${club.unique_id}`);
}

function validerHistoriqueEvolution(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.captures) || data.captures.length > 30
        || data.captures.some((c, i) => !c || !dateJeuUtc(c.date) || (i > 0 && c.date <= data.captures[i - 1].date) || !Array.isArray(c.joueurs)
            || c.joueurs.length > 1000 || c.joueurs.some(p => !p || !/^\d+$/.test(String(p.id))
                || typeof p.nom !== "string" || p.nom.length > 200 || typeof p.effectif !== "boolean"
                || !p.stats || typeof p.stats !== "object" || Array.isArray(p.stats)
                || Object.entries(p.stats).some(([k, v]) => !Object.hasOwn(nomsStats, k) || !Number.isFinite(v))
                || !(p.fin === null || (typeof p.fin === "string" && p.fin.length <= 30)))
            || new Set(c.joueurs.map(p => p.id)).size !== c.joueurs.length)) {
        throw new Error("Historique de partie invalide ; aucune donnée n’a été remplacée.");
    }
}

function lireEvolution() {
    const texte = localStorage.getItem(cleEvolution());
    if (!texte) return { version: 1, captures: [] };
    const data = JSON.parse(texte);
    validerHistoriqueEvolution(data);
    return data;
}

function capturerEvolution() {
    try {
        const historique = lireEvolution();
        const date = rawData.date_sauvegarde;
        if (!dateJeuUtc(date)) throw new Error("Date de sauvegarde indisponible : capture non enregistrée.");
        const precedente = historique.captures.at(-1);
        if (precedente && date < precedente.date) throw new Error("Sauvegarde plus ancienne que la dernière capture : historique inchangé.");
        const suivis = new Set(AssistantFMSuivi.liste().filter(item => item.joueur).map(item => String(item.joueur.unique_id)));
        const effectif = rawData.joueurs.filter(p => p.est_mon_club === true || suivis.has(String(p.unique_id)));
        const counts = new Map();
        rawData.joueurs.forEach(p => { const id = String(p.unique_id ?? ""); counts.set(id, (counts.get(id) || 0) + 1); });
        const joueurs = effectif.filter(p => /^\d+$/.test(String(p.unique_id ?? "")) && counts.get(String(p.unique_id)) === 1 && p.nom)
            .map(p => ({
                id: String(p.unique_id), nom: String(p.nom), effectif: p.est_mon_club === true,
                fin: p.fin_contrat || null,
                stats: Object.fromEntries(Object.entries(p.stats || {}).filter(([k, v]) =>
                    Object.hasOwn(nomsStats, k) && estNombre(v)).map(([k, v]) => [k, Number(v)]))
            })).sort((a, b) => a.id.localeCompare(b.id));
        const capture = { date, joueurs };
        if (precedente && precedente.date === date) {
            if (JSON.stringify(precedente) === JSON.stringify(capture)) {
                evolutionMessage = "Cette sauvegarde est déjà dans l’historique.";
                return;
            }
            historique.captures[historique.captures.length - 1] = capture;
            evolutionMessage = "Capture de la même date actualisée ; elle ne constitue pas une nouvelle étape.";
        } else {
            historique.captures.push(capture);
            historique.captures = historique.captures.slice(-30);
            evolutionMessage = "Capture enregistrée automatiquement dans ce navigateur.";
        }
        validerHistoriqueEvolution(historique);
        localStorage.setItem(cleEvolution(), JSON.stringify(historique));
    } catch (error) {
        evolutionMessage = `Historique : ${error.message}`;
        console.warn(evolutionMessage);
    } finally {
        document.getElementById("evolution-status").textContent = evolutionMessage;
    }
}

function differencesEvolution(avant, apres) {
    const anciens = new Map(avant.joueurs.map(p => [p.id, p]));
    const actuels = new Map(apres.joueurs.map(p => [p.id, p]));
    const arrives = apres.joueurs.filter(p => p.effectif && !anciens.get(p.id)?.effectif);
    const departs = avant.joueurs.filter(p => p.effectif && !actuels.get(p.id)?.effectif);
    const changements = apres.joueurs.filter(p => anciens.has(p.id)).map(p => {
        const ancien = anciens.get(p.id);
        const stats = Object.keys(p.stats).filter(k => Number.isFinite(ancien.stats[k]) && p.stats[k] !== ancien.stats[k])
            .map(k => ({ key: k, delta: p.stats[k] - ancien.stats[k] }))
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        return { joueur: p, stats, contrat: p.fin !== ancien.fin && p.fin && ancien.fin ? `${ancien.fin} → ${p.fin}` : "" };
    }).filter(item => item.stats.length || item.contrat);
    return { arrives, departs, changements };
}

function afficherJournal() {
    const cible = document.getElementById("journal-view");
    try {
        const captures = lireEvolution().captures;
        let html = `<h2>Historique de partie</h2><p class="caveat">${escapeHtml(evolutionMessage)} Chaque nouvelle date chargée conserve les attributs de l’effectif et des cibles suivies, jusqu’à 30 étapes. Les données restent locales, par club et nom de partie. Les identités ambiguës sont exclues ; un changement de suivi peut ressembler à une arrivée ou un départ. Dates plus anciennes ignorées.</p>`;
        if (captures.length < 2) html += "<p>Chargez deux sauvegardes de dates différentes pour voir les évolutions observées. Nommez d’abord votre partie.</p>";
        for (let i = captures.length - 1; i > 0; i--) {
            const a = captures[i - 1], b = captures[i], d = differencesEvolution(a, b);
            const noms = liste => liste.map(p => escapeHtml(p.nom)).join(", ") || "aucun";
            html += `<div class="dashboard-card"><h3>${escapeHtml(a.date)} → ${escapeHtml(b.date)}</h3>
                <p>Entrées dans l’effectif : ${noms(d.arrives)}<br>Sorties de l’effectif : ${noms(d.departs)}</p>
                <p>${d.changements.slice(0, 30).map(item => `${escapeHtml(item.joueur.nom)} : ${item.stats.slice(0, 5).map(s => `${escapeHtml(nomsStats[s.key])} ${s.delta > 0 ? "+" : ""}${s.delta}`).join(" · ")}${item.contrat ? ` · contrat ${escapeHtml(item.contrat)}` : ""}`).join("<br>") || "Aucun changement d’attribut ou de contrat observé."}</p></div>`;
        }
        const personnes = new Map();
        captures.forEach(capture => capture.joueurs.forEach(joueur => personnes.set(joueur.id, joueur.nom)));
        const options = [...personnes].sort((a, b) => a[1].localeCompare(b[1], "fr"))
            .map(([id, nom]) => `<option value="${escapeHtml(id)}"${id === evolutionJoueur ? " selected" : ""}>${escapeHtml(nom)}</option>`).join("");
        html += `<section class="dashboard-card"><h3>Courbe d’évolution des attributs</h3><p class="caveat">Valeurs observées uniquement, jusqu'à 30 captures. Une donnée absente coupe la courbe ; aucune interpolation ni projection.</p>
            <label>Joueur <select id="evolution-joueur"><option value="">Choisir un joueur</option>${options}</select></label>
            <label>Attribut <select id="evolution-attribut"><option value="">Choisir un attribut</option>${Object.entries(nomsStats).map(([key, nom]) => `<option value="${escapeHtml(key)}"${key === evolutionAttribut ? " selected" : ""}>${escapeHtml(nom)}</option>`).join("")}</select></label>
            <div id="evolution-courbe"></div></section>`;
        cible.innerHTML = html;
        const courbe = () => {
            evolutionJoueur = cible.querySelector("#evolution-joueur").value;
            evolutionAttribut = cible.querySelector("#evolution-attribut").value;
            const sortie = cible.querySelector("#evolution-courbe");
            if (!evolutionJoueur || !evolutionAttribut) { sortie.textContent = "Choisissez un joueur et un attribut."; return; }
            const valeurs = captures.map(c => ({ date: c.date, valeur: c.joueurs.find(p => p.id === evolutionJoueur)?.stats[evolutionAttribut] }));
            const connues = valeurs.filter(item => Number.isFinite(item.valeur)).map(item => item.valeur);
            const min = Math.min(1, ...connues), max = Math.max(20, ...connues);
            const points = valeurs.map((item, i) => Number.isFinite(item.valeur)
                ? { x: 30 + (valeurs.length === 1 ? 0 : i * 540 / (valeurs.length - 1)), y: 201 - (item.valeur - min) * 171 / (max - min), ...item } : null);
            const segments = points.slice(1).map((point, i) => point && points[i]
                ? `<line x1="${points[i].x}" y1="${points[i].y}" x2="${point.x}" y2="${point.y}" stroke="#77c9ff" stroke-width="2"/>` : "").join("");
            const markers = points.filter(Boolean).map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#77c9ff"><title>${escapeHtml(p.date)} : ${escapeHtml(p.valeur)}</title></circle>`).join("");
            sortie.innerHTML = `<svg viewBox="0 0 600 220" role="img" aria-label="Évolution observée de l'attribut, valeurs détaillées dans le tableau" style="width:100%;max-width:600px;height:auto"><line x1="30" y1="30" x2="30" y2="201" stroke="currentColor"/><line x1="30" y1="201" x2="570" y2="201" stroke="currentColor"/><text x="0" y="34" fill="currentColor">${escapeHtml(max)}</text><text x="0" y="202" fill="currentColor">${escapeHtml(min)}</text>${segments}${markers}</svg>
                <table><thead><tr><th>Date</th><th>Valeur observée</th></tr></thead><tbody>${valeurs.map(p => `<tr><td>${escapeHtml(p.date)}</td><td>${Number.isFinite(p.valeur) ? escapeHtml(p.valeur) : "—"}</td></tr>`).join("")}</tbody></table>`;
        };
        cible.querySelector("#evolution-joueur").addEventListener("change", courbe);
        cible.querySelector("#evolution-attribut").addEventListener("change", courbe);
        courbe();
    } catch (error) { cible.innerHTML = `<h2>Historique de partie</h2><p role="alert">${escapeHtml(error.message)}</p>`; }
}

function tactiqueSelectionnee() {
    return rawData.tactiques.find(t => String(t.id) === document.getElementById("tactique-select").value);
}

function optionsTactiques(selected) {
    return `<option value="">Choisir une tactique</option>` + rawData.tactiques.map(t =>
        `<option value="${escapeHtml(t.id)}"${String(t.id) === String(selected || "") ? " selected" : ""}>${escapeHtml(t.nom)}</option>`).join("");
}

function candidatsDirecteur(position, role, profil) {
    const best = [];
    const budget = mercatoMontants.budget === null ? budgetTransfert() : Number(mercatoMontants.budget);
    const compare = (a, b) => profil === "budget" ? (a.cout - b.cout || b.score - a.score) : b.score - a.score;
    for (const p of rawData.joueurs) {
        if (p.est_mon_club === true || !joueurAuPoste(p, position)
            || (profil === "jeune" && (!estNombre(p.age) || Number(p.age) > 21))) continue;
        const cout = coutEstime(p);
        if (profil === "budget" && (cout === null || mercatoMontants.budget === "" || cout > budget)) continue;
        const score = noteRole(p, role, position);
        if (!Number.isFinite(score)) continue;
        const item = { player: p, score, cout };
        if (best.length < 3 || compare(item, best[best.length - 1]) < 0) {
            best.push(item);
            best.sort(compare);
            if (best.length > 3) best.pop();
        }
    }
    return best;
}

function resumeAttributsCandidat(player, role) {
    const attributs = role.stats.filter(key => estNombre(player.stats?.[key]))
        .map(key => ({ key, valeur: Number(player.stats[key]) }))
        .sort((a, b) => b.valeur - a.valeur);
    if (!attributs.length) return "attributs indisponibles";
    const texte = liste => liste.map(item => `${nomsStats[item.key] || item.key} ${item.valeur}`).join(", ");
    return `Points forts : ${texte(attributs.slice(0, 2))} ; à examiner : ${texte(attributs.slice(-2).reverse())}`;
}

function afficherMercato() {
    const cible = document.getElementById("mercato-view");
    const tactic = tactiqueSelectionnee();
    if (mercatoTactique !== String(tactic?.id ?? "")) {
        mercatoChoix = {};
        mercatoTactique = String(tactic?.id ?? "");
    }
    if (mercatoMontants.budget === null) mercatoMontants.budget = valeurBudgetTransfert();
    const effectif = rawData.joueurs.filter(p => p.est_mon_club === true);
    const repartition = tactic ? repartirEffectif(tactic, effectif) : [];
    let ciblesSuivies = [], erreurSuivi = "";
    try { ciblesSuivies = AssistantFMSuivi.liste().map(item => item.joueur).filter(p => p && p.est_mon_club !== true && p.uid != null); }
    catch (error) { erreurSuivi = error.message; }
    const ordre = repartition.map((slot, index) => ({ slot, index })).sort((a, b) => {
        const priorite = slot => mercatoObjectif === "titulaire" ? Number(!slot.titulaire)
            : mercatoObjectif === "profondeur" ? Number(!slot.doublure) : Number(!slot.titulaire) * 2 + Number(!slot.doublure);
        return priorite(b.slot) - priorite(a.slot) || a.index - b.index;
    });
    const cache = new Map();
    const cartes = ordre.map(({ slot, index }) => {
        const key = `${slot.position}:${slot.roleId}`;
        if (!cache.has(key)) cache.set(key, candidatsDirecteur(slot.position, roles[slot.roleId], mercatoProfil));
        const candidats = cache.get(key);
        const suivis = ciblesSuivies.filter(player => joueurAuPoste(player, slot.position)
            && Number.isFinite(noteRole(player, roles[slot.roleId], slot.position))
            && !candidats.some(c => String(c.player.uid) === String(player.uid)));
        const choix = mercatoChoix[index] || {};
        let selectionHorsListe = "";
        if (choix.id && !candidats.some(c => String(c.player.uid) === String(choix.id))
            && !suivis.some(player => String(player.uid) === String(choix.id))) {
            const player = rawData.joueurs.find(p => String(p.uid) === String(choix.id));
            selectionHorsListe = `<option value="${escapeHtml(choix.id)}" selected>${escapeHtml(player?.nom || "Cible indisponible")} · hors des suggestions actuelles</option>`;
        }
        const action = !slot.titulaire ? "Titulaire manquant" : !slot.doublure ? "Doublure manquante" : "Poste couvert";
        const reference = slot.titulaire ? `${linkJoueur(slot.titulaire.player)} · ${slot.titulaire.score.toFixed(1)}/20` : "aucun";
        return `<div class="dashboard-card mercato-card"><div class="diagnostic-card-heading"><h3>${escapeHtml(nomPoste(slot.position))} · ${escapeHtml(roles[slot.roleId].nom)} <small>· place ${index + 1}</small></h3><span class="diagnostic-status${!slot.titulaire || !slot.doublure ? " shortage" : ""}">${escapeHtml(action)}</span></div>
            <p><strong>Titulaire indicatif :</strong> ${reference}<br><strong>Doublure indicative :</strong> ${slot.doublure ? linkJoueur(slot.doublure.player) : "non affectée"}</p>
            <label>Choisir une cible pour ce poste<select data-mercato-cible="${index}"><option value="">Aucune cible sélectionnée</option>${selectionHorsListe}${candidats.map(c => `<option value="${escapeHtml(c.player.uid)}"${String(choix.id) === String(c.player.uid) ? " selected" : ""}>${escapeHtml(c.player.nom)} · ${c.score.toFixed(1)}/20 · ${escapeHtml(c.cout === null ? "coût inconnu" : formatMoney(c.cout))}</option>`).join("")}${suivis.length ? `<optgroup label="Cibles du suivi · hors suggestions">${suivis.map(player => `<option value="${escapeHtml(player.uid)}"${String(choix.id) === String(player.uid) ? " selected" : ""}>${escapeHtml(player.nom)} · suivi</option>`).join("")}</optgroup>` : ""}</select></label>
            <details><summary>Voir les ${candidats.length} candidat(s)</summary>${candidats.map(c => `<div class="diagnostic-candidate">${linkJoueur(c.player)} · ${c.score.toFixed(1)}/20${slot.titulaire ? ` · écart ${c.score - slot.titulaire.score >= 0 ? "+" : ""}${(c.score - slot.titulaire.score).toFixed(1)}` : ""} · ${escapeHtml(c.cout === null ? "coût inconnu" : formatMoney(c.cout))}<br><small>${escapeHtml(resumeAttributsCandidat(c.player, roles[slot.roleId]))}</small></div>`).join("") || "<p>Aucun candidat avec ces critères.</p>"}</details>
            <div class="mercato-cible-montants" data-mercato-montants="${index}"${choix.id ? "" : " hidden"}><p class="caveat">Montants à vérifier : frais préremplis uniquement lorsqu’ils sont estimables ; salaire à saisir.</p>
            <label>Frais hypothétiques (€)<input type="number" min="0" step="1" data-mercato-frais="${index}" value="${escapeHtml(choix.frais ?? "")}" placeholder="Non renseigné"></label>
            <label>Salaire hypothétique (€/sem.)<input type="number" min="0" step="1" data-mercato-salaire="${index}" value="${escapeHtml(choix.salaire ?? "")}" placeholder="Non renseigné"></label></div></div>`;
    }).join("");
    const sansTitulaire = repartition.filter(slot => !slot.titulaire).length;
    const sansDoublure = repartition.filter(slot => slot.titulaire && !slot.doublure).length;
    cible.innerHTML = `<h2>Copilote mercato</h2><p>Construisez un plan en trois étapes : choisissez une tactique et un profil, examinez les postes à renforcer, puis sélectionnez vos cibles et vérifiez les montants.</p><p class="caveat">Simulation temporaire : aucune modification dans FM. Prix demandé, salaire exigé et volonté de signer sont inconnus ; coûts et notes sont indicatifs. Les candidats ne sont pas filtrés par intérêt réel.</p>
        <h3>1 · Définir le plan</h3>
        <div class="decision-controls"><label>Tactique<select id="mercato-tactique">${optionsTactiques(tactic?.id)}</select></label>
        <label>Objectif<select id="mercato-objectif"><option value="equilibre">Équilibrer l’effectif</option><option value="titulaire">Priorité aux titulaires</option><option value="profondeur">Priorité aux doublures</option></select></label>
        <label>Profil<select id="mercato-profil"><option value="immediat">Prêt immédiatement · note de rôle</option><option value="jeune">Pari à développer · 21 ans ou moins</option><option value="budget">Petit budget · coût estimé</option></select></label>
        <label>Budget hypothétique (€)<input id="mercato-budget" type="number" min="0" value="${escapeHtml(mercatoMontants.budget)}"></label></div>
        <details class="mercato-avance"><summary>Hypothèses de ventes et économies salariales</summary><div class="decision-controls">
        <label>Ventes hypothétiques (€)<input id="mercato-ventes" type="number" min="0" value="${escapeHtml(mercatoMontants.ventes)}"></label>
        <label>Économie salariale hypothétique (€/sem.)<input id="mercato-economie" type="number" min="0" value="${escapeHtml(mercatoMontants.economie)}"></label></div>
        </details><h3>2 · Examiner les postes et sélectionner les cibles</h3><p class="mercato-resume">${tactic ? `${repartition.length} places · ${sansTitulaire} sans titulaire · ${sansDoublure} sans doublure` : "Choisissez une tactique pour afficher les besoins."} Les besoins sont basés sur une répartition indicative, pas sur les titulaires en jeu.</p><p id="mercato-total" class="mercato-resume" role="status"></p>
        ${erreurSuivi ? `<p role="status">Cibles du suivi indisponibles : ${escapeHtml(erreurSuivi)}</p>` : ""}
        <p class="caveat">Les cibles du suivi compatibles avec le poste sont également proposées, même hors des suggestions automatiques.</p><div class="mercato-grid">${cartes || "<p>Sélectionnez une tactique pour construire le plan.</p>"}</div>
        <h3>3 · Comparer les scénarios</h3><p class="caveat">Le récapitulatif du budget apparaît au-dessus des postes. Les comparaisons restent temporaires.</p><button type="button" id="mercato-memoriser">Comparer ce scénario</button>
        <button type="button" id="mercato-effacer">Effacer les comparaisons</button>
        <p id="mercato-comparaison-status" role="status"></p>
        <div class="dashboard-grid" id="mercato-comparaisons">${mercatoScenarios.map((scenario, i) =>
            `<div class="dashboard-card"><h3>Scénario ${i + 1} · ${escapeHtml(scenario.profil)}</h3><p>${escapeHtml(scenario.tactique)} · ${escapeHtml(scenario.objectif)}</p><p>Cibles : ${escapeHtml(scenario.cibles)}</p><p>${escapeHtml(scenario.total)}</p></div>`).join("")}</div>
        ${panneauScenarios("mercato")}`;
    monterScenarios(cible, "mercato");
    document.getElementById("mercato-profil").value = mercatoProfil;
    document.getElementById("mercato-objectif").value = mercatoObjectif;
    document.getElementById("mercato-objectif").addEventListener("change", e => { mercatoObjectif = e.target.value; afficherMercato(); });
    document.getElementById("mercato-tactique").addEventListener("change", e => {
        document.getElementById("tactique-select").value = e.target.value;
        mercatoChoix = {};
        afficherMercato();
    });
    document.getElementById("mercato-profil").addEventListener("change", e => { mercatoProfil = e.target.value; mercatoChoix = {}; afficherMercato(); });
    cible.querySelectorAll("[data-mercato-cible]").forEach(select => select.addEventListener("change", e => {
        const index = e.target.dataset.mercatoCible;
        const player = rawData.joueurs.find(p => String(p.uid) === e.target.value);
        const cout = player ? coutEstime(player) : null;
        mercatoChoix[index] = { id: e.target.value, frais: cout ?? "", salaire: "" };
        cible.querySelector(`[data-mercato-montants="${index}"]`).hidden = !e.target.value;
        cible.querySelector(`[data-mercato-frais="${index}"]`).value = cout ?? "";
        cible.querySelector(`[data-mercato-salaire="${index}"]`).value = "";
        actualiserTotalMercato();
    }));
    cible.querySelectorAll("[data-mercato-frais], [data-mercato-salaire]").forEach(input => input.addEventListener("input", e => {
        const index = e.target.dataset.mercatoFrais ?? e.target.dataset.mercatoSalaire;
        const key = e.target.dataset.mercatoFrais != null ? "frais" : "salaire";
        (mercatoChoix[index] || (mercatoChoix[index] = {}))[key] = e.target.value;
        actualiserTotalMercato();
    }));
    cible.querySelectorAll("#mercato-budget, #mercato-ventes, #mercato-economie").forEach(input => input.addEventListener("input", e => {
        mercatoMontants[e.target.id.replace("mercato-", "")] = e.target.value;
        actualiserTotalMercato();
    }));
    document.getElementById("mercato-budget").addEventListener("change", () => {
        if (mercatoProfil === "budget") { mercatoChoix = {}; afficherMercato(); }
    });
    document.getElementById("mercato-memoriser").addEventListener("click", () => {
        const status = document.getElementById("mercato-comparaison-status");
        const choix = Object.values(mercatoChoix).filter(item => item.id);
        if (!tactic || !choix.length) { status.textContent = "Sélectionnez une tactique et au moins une cible."; return; }
        if ([...cible.querySelectorAll("input[type=number]")].some(input => !input.checkValidity())
            || new Set(choix.map(item => item.id)).size !== choix.length) {
            status.textContent = "Corrigez les montants invalides ou les cibles en double."; return;
        }
        if (mercatoScenarios.length >= 3) { status.textContent = "Trois scénarios sont déjà mémorisés ; effacez-les pour recommencer."; return; }
        mercatoScenarios.push({
            profil: document.getElementById("mercato-profil").selectedOptions[0].textContent,
            objectif: document.getElementById("mercato-objectif").selectedOptions[0].textContent,
            tactique: tactic.nom,
            cibles: choix.map(item => rawData.joueurs.find(p => String(p.uid) === String(item.id))?.nom || "Joueur indisponible").join(", "),
            total: document.getElementById("mercato-total").textContent
        });
        afficherMercato();
        document.getElementById("mercato-comparaison-status").textContent = "Scénario mémorisé temporairement pour comparaison.";
    });
    document.getElementById("mercato-effacer").addEventListener("click", () => { mercatoScenarios = []; afficherMercato(); });
    actualiserTotalMercato();
}

function actualiserTotalMercato() {
    const cible = document.getElementById("mercato-view");
    const status = document.getElementById("mercato-total");
    const controls = [...cible.querySelectorAll("input[type=number]")];
    if (controls.some(input => !input.checkValidity())) { status.textContent = "Corrigez les montants invalides."; return; }
    const choix = Object.values(mercatoChoix).filter(item => item.id);
    if (new Set(choix.map(item => item.id)).size !== choix.length) { status.textContent = "Une même cible est sélectionnée plusieurs fois : choisissez un seul poste par joueur."; return; }
    const budget = document.getElementById("mercato-budget").value;
    const ventes = document.getElementById("mercato-ventes").value;
    const economie = document.getElementById("mercato-economie").value;
    const fraisConnus = choix.every(item => item.frais !== "" && item.frais != null);
    const salairesConnus = choix.every(item => item.salaire !== "" && item.salaire != null);
    const frais = choix.reduce((sum, item) => sum + Number(item.frais || 0), 0);
    const salaires = choix.reduce((sum, item) => sum + Number(item.salaire || 0), 0);
    status.textContent = `${choix.length} cible(s) · Frais : ${fraisConnus ? formatMoney(frais) : "incomplets"} · Solde transfert : ${fraisConnus && budget !== "" && ventes !== "" ? formatMoney(Number(budget) + Number(ventes) - frais) : "non calculable"} · Variation salaires : ${salairesConnus && economie !== "" ? `${formatMoney(salaires - Number(economie))}/sem` : "incomplète"}. Les ventes et économies sont des hypothèses globales.`;
}

function afficherLaboratoire() {
    const cible = document.getElementById("laboratoire-view");
    const options = optionsTactiques(labo?.source);
    if (!labo) {
        cible.innerHTML = `<h2>Laboratoire tactique</h2><p>Choisissez une tactique comme point de départ. La simulation ne modifie pas la sauvegarde ni votre tactique sélectionnée.</p><label>Tactique de départ<select id="labo-source">${options}</select></label>${panneauScenarios("tactique")}`;
    } else {
        const tactique = { id: "__simulation_directeur__", postes: labo.postes };
        tacticalRoles[tactique.id] = labo.roles;
        const effectif = rawData.joueurs.filter(p => p.est_mon_club === true);
        const repartition = repartirEffectif(tactique, effectif, labo.titulaires);
        const placement = placerPostesTerrain(labo.postes.map(slot => ({
            slot,
            position: positionTactique(slot.avec_ball[0]) || positionTactique(slot.sans_ball?.[0])
        })).filter(item => rolesParPoste[item.position]));
        if (!placement.places.some(({ slot }) => String(slot.numero) === String(labo.place))) {
            labo.place = placement.places[0]?.slot.numero ?? null;
        }
        const markers = placement.places.map(({ slot, position, row, col, x }) => {
            const roleId = labo.roles[slot.numero] || rolesParPoste[position]?.[0];
            const repart = repartition.find(r => String(r.numero) === String(slot.numero));
            const positionLabel = nomPosteTerrain(position, x);
            const title = `${positionLabel} · ${roles[roleId]?.nom || "Rôle indisponible"} · ${repart?.titulaire?.player.nom || "Non couvert"}`;
            return `<button type="button" class="compact-pitch-slot planner-marker" data-labo-place="${escapeHtml(slot.numero)}" style="grid-row:${row};grid-column:${col}" aria-pressed="${String(slot.numero) === String(labo.place)}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}">${contenuPlaceTerrain(position, roles[roleId]?.nom || "", x)}</button>`;
        }).join("");
        const selected = placement.places.find(({ slot }) => String(slot.numero) === String(labo.place));
        let detail = "<p>Aucun poste reconnu dans cette tactique.</p>";
        if (selected) {
            const { slot, position, x } = selected;
            const roleId = labo.roles[slot.numero] || rolesParPoste[position]?.[0];
            const role = roles[roleId];
            const repart = repartition.find(r => String(r.numero) === String(slot.numero));
            const positionOptions = ordrePostesTerrain.filter(key => rolesParPoste[key]).map(key =>
                `<option value="${escapeHtml(key)}"${key === position ? " selected" : ""}>${escapeHtml(nomPoste(key))}</option>`).join("");
            const roleOptions = (rolesParPoste[position] || []).map(id =>
                `<option value="${escapeHtml(id)}"${id === roleId ? " selected" : ""}>${escapeHtml(roles[id].nom)}</option>`);
            const optionsJoueurs = effectif.filter(player => player.uid != null && joueurAuPoste(player, position))
                .map(player => ({ player, score: noteRole(player, role, position) }))
                .filter(item => Number.isFinite(item.score))
                .sort((a, b) => b.score - a.score || String(a.player.nom).localeCompare(String(b.player.nom), "fr"))
                .map(item => `<option value="${escapeHtml(item.player.uid)}"${String(item.player.uid) === String(repart?.titulaire?.player.uid) ? " selected" : ""}>${escapeHtml(item.player.nom)} · ${item.score.toFixed(1)}/20</option>`).join("");
            const candidats = role ? joueursRecommandesPourPoste(position, role, 3, true).candidates : [];
            const candidateRows = candidats.map(candidate =>
                `<li>${linkJoueur(candidate.player)} · ${candidate.score.toFixed(1)}/20 · ${escapeHtml(formatMoney(coutEstime(candidate.player)))}</li>`
            ).join("") || "<li>Aucun profil ne satisfait le budget et la marge de réputation.</li>";
            detail = `<div class="labo-detail"><h3>${escapeHtml(nomPosteTerrain(position, x))} · place ${escapeHtml(slot.numero)}</h3>
                <label>Poste<select data-labo-position="${escapeHtml(slot.numero)}">${positionOptions}</select></label>
                <label>Rôle<select data-labo-role="${escapeHtml(slot.numero)}">${roleOptions.join("")}</select></label>
                <label>Titulaire<select data-labo-titulaire="${escapeHtml(slot.numero)}"><option value="">Affectation automatique</option>${optionsJoueurs}</select></label>
                <p>${repart?.titulaire ? `Titulaire : ${linkJoueur(repart.titulaire.player)} · ${repart.titulaire.score.toFixed(1)}/20${labo.titulaires[slot.numero] != null ? " · choix manuel" : " · automatique"}` : "Titulaire non couvert"}</p>
                <p>Doublure : ${repart?.doublure ? `${linkJoueur(repart.doublure.player)} · ${repart.doublure.score.toFixed(1)}/20` : "non couverte"}</p>
                <strong>Joueurs suggérés</strong><ul class="labo-suggestions">${candidateRows}</ul></div>`;
        }
        cible.innerHTML = `<h2>Laboratoire tactique</h2><p class="caveat">Simulation locale temporaire : cliquez sur une place pour modifier son poste, son rôle et son titulaire. Affectations sans doublons. Les suggestions utilisent le budget et la marge de réputation de « Recrutement » &gt; « Joueurs » ; l’intérêt et le prix demandé restent inconnus.</p>
            <label>Tactique de départ<select id="labo-source">${options}</select></label>
            <p>${repartition.filter(r => r.titulaire).length}/${labo.postes.length} places avec titulaire · ${repartition.filter(r => r.doublure).length}/${labo.postes.length} avec doublure.</p>
            <div class="labo-layout"><div class="football-pitch compact-pitch labo-pitch" style="--pitch-columns:${placement.colonnes};--pitch-rows:${placement.lignes}" aria-label="Choisir une place tactique">${markers}</div>${detail}</div>${panneauScenarios("tactique")}`;
        cible.querySelectorAll("[data-labo-place]").forEach(button => button.addEventListener("click", e => {
            labo.place = e.currentTarget.dataset.laboPlace;
            afficherLaboratoire();
        }));
        cible.querySelectorAll("[data-labo-position]").forEach(select => select.addEventListener("change", e => {
            const slot = labo.postes.find(item => String(item.numero) === e.target.dataset.laboPosition);
            if (!slot) return;
            slot.avec_ball = [e.target.value];
            slot.sans_ball = [e.target.value];
            labo.roles[slot.numero] = rolesParPoste[e.target.value]?.[0];
            delete labo.titulaires[slot.numero];
            afficherLaboratoire();
        }));
        cible.querySelectorAll("[data-labo-role]").forEach(select => select.addEventListener("change", e => {
            const slot = labo.postes.find(item => String(item.numero) === e.target.dataset.laboRole);
            if (!slot) return;
            labo.roles[slot.numero] = e.target.value;
            const player = effectif.find(item => String(item.uid) === String(labo.titulaires[slot.numero]));
            const position = positionTactique(slot.avec_ball[0]) || positionTactique(slot.sans_ball?.[0]);
            if (player && !Number.isFinite(noteRole(player, roles[e.target.value], position))) delete labo.titulaires[slot.numero];
            afficherLaboratoire();
        }));
        cible.querySelectorAll("[data-labo-titulaire]").forEach(select => select.addEventListener("change", e => {
            const numero = e.target.dataset.laboTitulaire;
            const id = e.target.value;
            delete labo.titulaires[numero];
            if (id) {
                Object.keys(labo.titulaires).forEach(key => {
                    if (String(labo.titulaires[key]) === id) delete labo.titulaires[key];
                });
                labo.titulaires[numero] = id;
            }
            afficherLaboratoire();
        }));
    }
    monterScenarios(cible, "tactique");
    document.getElementById("labo-source").addEventListener("change", e => {
        const base = rawData.tactiques.find(t => String(t.id) === e.target.value);
        labo = base ? { source: base.id, postes: (base.postes || []).map(slot => ({
            ...slot, avec_ball: [...(slot.avec_ball || [])], sans_ball: [...(slot.sans_ball || [])]
        })), roles: { ...(tacticalRoles[base.id] || {}) }, titulaires: {}, place: null } : null;
        afficherLaboratoire();
    });
}

function afficherJeunes() {
    const cible = document.getElementById("jeunes-view");
    const jeunes = rawData.joueurs.filter(p => p.est_mon_club === true && estNombre(p.age) && Number(p.age) <= 21)
        .sort((a, b) => Number(a.age) - Number(b.age) || String(a.nom).localeCompare(String(b.nom), "fr"));
    let ancien = new Map(), erreur = "";
    try {
        const captures = lireEvolution().captures;
        if (captures.length > 1 && captures[captures.length - 1].date === rawData.date_sauvegarde) {
            ancien = new Map(captures[captures.length - 2].joueurs.map(p => [p.id, p]));
        }
    } catch (error) { erreur = error.message; }
    const lignes = Array.isArray(rawData.statistiques_saison) ? rawData.statistiques_saison : [];
    cible.innerHTML = `<h2>Développement des jeunes · 21 ans ou moins</h2>
        <p class="caveat">Progression = différences d’attributs observées entre les deux dernières captures, pas une projection de potentiel. Minutes de saison expérimentales FM27 : lignes séparées par compétition/équipe, à vérifier dans le jeu ; aucune ligne n’est interprétée comme zéro minute. Les décisions sont des pistes à examiner, pas des prédictions.</p>
        ${erreur ? `<p role="status">${escapeHtml(erreur)}</p>` : ""}
        <div class="dashboard-grid">${jeunes.map(p => {
            const avant = ancien.get(String(p.unique_id));
            const changements = avant ? Object.keys(p.stats || {}).filter(k => Number.isFinite(avant.stats[k]) && estNombre(p.stats[k]) && Number(p.stats[k]) !== avant.stats[k])
                .map(k => ({ key: k, delta: Number(p.stats[k]) - avant.stats[k] }))
                .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) : [];
            const minutes = lignes.filter(r => String(r.player_uid) === String(p.uid) && estNombre(r.minutes))
                .map(r => `${escapeHtml(r.kind || "type inconnu")} / équipe ${r.team_slot == null ? "?" : Number(r.team_slot) + 1} : ${escapeHtml(r.minutes)} min`).join(" · ");
            return `<div class="dashboard-card"><h3>${linkJoueur(p)} · ${escapeHtml(p.age)} ans</h3><p>${escapeHtml(afficherPoste(p))}</p>
                <p>Évolution : ${avant ? changements.slice(0, 5).map(s => `${escapeHtml(nomsStats[s.key] || s.key)} ${s.delta > 0 ? "+" : ""}${s.delta}`).join(" · ") || "aucune variation observée" : "comparaison indisponible"}</p>
                <p>Temps de jeu expérimental : ${minutes || "non disponible"}</p><p>À examiner : conserver pour suivre sa progression ; prêt ou vente selon temps de jeu, besoins et contrat dans FM.</p></div>`;
        }).join("") || "<p>Aucun joueur de 21 ans ou moins identifié dans l’effectif.</p>"}</div>`;
}

function afficherConfiance() {
    const cible = document.getElementById("confiance-view");
    const version = rawData.version_jeu?.build || "non indiquée dans cette extraction";
    const stats = Array.isArray(rawData.statistiques_saison);
    cible.innerHTML = `<h2>Confiance des données</h2><p>Version : ${escapeHtml(version)}. La présence d’un champ n’établit pas son exactitude pour FM27.</p>
        <div class="dashboard-grid">
        <div class="dashboard-card"><h3>Exporté · à confirmer</h3><p>Effectif, attributs, postes, contrats, valeur marchande et finances proviennent du fichier ; vérifiez les données importantes dans le jeu. Aucun statut « vérifié FM27 » n’est attribué sans comparaison.</p></div>
        <div class="dashboard-card"><h3>Expérimental</h3><p>Performances de saison : ${stats ? `${rawData.statistiques_saison.length} ligne(s) présentes` : "non présentes dans cette base"}. Champs FM27 non confirmés ; réextrayez puis comparez au jeu. ${escapeHtml(rawData.erreur_statistiques_saison || "")}</p></div>
        <div class="dashboard-card"><h3>Calculé · indicatif</h3><p>Notes de rôle, couverture, recommandations, coûts estimés et scénarios sont des calculs de l’application, pas des valeurs officielles ni des prédictions de match.</p></div>
        <div class="dashboard-card"><h3>Indisponible</h3><p>Prix demandé, volonté de signer, salaire exigé et attributs futurs individuels ne sont pas connus. Les cases vides restent inconnues.</p></div>
        <div class="dashboard-card"><h3>Observé localement</h3><p>Les différences entre captures comparent les valeurs exportées à deux dates ; elles héritent de l’incertitude de ces valeurs et ne prouvent pas leur exactitude.</p></div></div>`;
}

function actualiserColonnes(headers) {
    const panel = document.getElementById("column-options-list");
    if (!panel) return;
    const key = clePourPartie(`assistantfm-colonnes-v1:${mode}`);
    let hidden = [];
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            hidden = JSON.parse(saved);
            if (!Array.isArray(hidden) || hidden.some(x => typeof x !== "string")) throw new Error("Préférences de colonnes invalides.");
        }
    } catch (error) { panel.textContent = `Préférences indisponibles : ${error.message}`; return; }
    panel.replaceChildren();
    let style = document.getElementById("column-visibility-style");
    if (!style) { style = document.createElement("style"); style.id = "column-visibility-style"; document.head.appendChild(style); }
    const appliquer = () => {
        style.textContent = headers.map(([id], index) => hidden.includes(id) ? `#results-table th:nth-child(${index + 1}), #results-table td:nth-child(${index + 1}) { display:none; }` : "").join("\n");
    };
    headers.forEach(([id, label]) => {
        const wrapper = document.createElement("label");
        const check = document.createElement("input");
        check.type = "checkbox"; check.checked = !hidden.includes(id);
        check.addEventListener("change", () => {
            hidden = check.checked ? hidden.filter(item => item !== id) : [...hidden, id];
            appliquer();
            try { localStorage.setItem(key, JSON.stringify(hidden)); }
            catch (error) { document.getElementById("column-status").textContent = `Enregistrement impossible : ${error.message}`; }
        });
        wrapper.append(check, document.createTextNode(label));
        panel.append(wrapper);
    });
    const status = document.createElement("span"); status.id = "column-status"; status.setAttribute("role", "status"); panel.append(status);
    appliquer();
}

const rechercheGlobale = document.getElementById("global-search");
const resultatsGlobaux = document.getElementById("global-results");
rechercheGlobale.addEventListener("input", () => {
    clearTimeout(rechercheTimer);
    rechercheTimer = setTimeout(() => {
        const query = rechercheGlobale.value.trim().toLocaleLowerCase("fr");
        resultatsGlobaux.replaceChildren();
        if (query.length < 2) return;
        const matches = [];
        for (const [collection, kind] of [[rawData.joueurs, "joueur"], [rawData.staff, "staff"], [rawData.clubs || [], "club"]]) {
            let count = 0;
            for (const item of collection) {
                const name = kind === "club" ? item.name : item.nom;
                const details = kind === "joueur" ? afficherPoste(item) : kind === "staff" ? traduireMetier(item.metier) : "";
                if (![name, details, item.club].some(v => String(v || "").toLocaleLowerCase("fr").includes(query))) continue;
                matches.push({ item, kind, name, details });
                if (++count >= 5) break;
            }
        }
        if (!matches.length) { resultatsGlobaux.textContent = "Aucun résultat."; return; }
        matches.forEach(({ item, kind, name, details }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = `${name || "Sans nom"} · ${kind}${details ? ` · ${details}` : ""}${item.club ? ` · ${item.club}` : ""}`;
            button.addEventListener("click", () => {
                ouvrirProfil(kind, item.uid, name);
                resultatsGlobaux.replaceChildren();
            });
            resultatsGlobaux.append(button);
        });
    }, 180);
});
document.addEventListener("keydown", event => {
    const editable = event.target instanceof Element && (event.target.matches("input, textarea, select") || event.target.isContentEditable);
    if (event.key === "/" && !editable && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); rechercheGlobale.focus();
    } else if (event.key === "Escape" && document.activeElement === rechercheGlobale) {
        resultatsGlobaux.replaceChildren(); rechercheGlobale.blur();
    }
});
document.addEventListener("click", event => {
    if (event.target instanceof Element && !event.target.closest(".global-search")) resultatsGlobaux.replaceChildren();
});
actualiserColonnes([["nom", "Nom"], ["poste", "Poste"], ["age", "Âge"], ["ca", "CA"], ["pa", "PA"], ["meilleur_role", "Meilleure position / rôle estimé"], ["club", "Club"]]);
