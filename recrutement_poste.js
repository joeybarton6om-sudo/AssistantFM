"use strict";

const recherchePoste = {
    tactique: "", place: "", mode: "maintenant", reference: "meilleur",
    references: new Map(), age: "", ages: { maintenant: "", futur: "21" }, budget: "", paMin: "", margeMin: "", contrat: "tous",
    cout: "tous", tri: "note", page: 0, cache: null
};

function reinitialiserRecrutementPoste() {
    recherchePoste.references.clear();
    recherchePoste.tactique = "";
    recherchePoste.place = "";
    recherchePoste.cache = null;
    recherchePoste.page = 0;
}

function ouvrirRecrutementDepuisDiagnostic(position, roleId) {
    const tactic = tactiqueSelectionnee();
    const group = tactic && groupesTactiques(tactic, "avec").get(position);
    const slot = group?.slots.find(item => item.roleId === roleId);
    if (!tactic || !slot) {
        document.getElementById("diagnostic-view").insertAdjacentHTML("afterbegin", '<p role="alert">Ce poste ne figure plus dans la tactique sélectionnée.</p>');
        return;
    }
    recherchePoste.tactique = String(tactic.id);
    recherchePoste.place = String(slot.numero);
    recherchePoste.references.set(`${tactic.id}:${slot.numero}`, "meilleur");
    recherchePoste.budget = valeurBudgetTransfert();
    recherchePoste.page = 0;
    recherchePoste.cache = null;
    changerOnglet("recrutement-poste");
}

function donneesComparables(player, position, role) {
    const attributs = role.stats.filter(key => poidsRole(role, key) > 0);
    const absents = attributs.filter(key => !estNombre(player.stats?.[key]) || Number(player.stats[key]) < 1 || Number(player.stats[key]) > 20);
    const aptitude = player.positions?.[position];
    if (!estNombre(aptitude) || Number(aptitude) < 1 || Number(aptitude) > 20) absents.push("aptitude au poste");
    const score = absents.length ? null : noteRole(player, role, position);
    return { absents, score: Number.isFinite(score) ? score : null, aptitude: estNombre(aptitude) ? Number(aptitude) : null };
}

function candidatsPoste(slot) {
    const role = roles[slot.roleId];
    const signature = JSON.stringify([slot.position, slot.roleId, role.stats.map(key => poidsRole(role, key)), multipleOffreDefaut]);
    if (recherchePoste.cache?.data === rawData && recherchePoste.cache.signature === signature) return recherchePoste.cache;
    const items = [];
    let incomplets = 0;
    for (const joueur of rawData.joueurs) {
        if (joueur.est_mon_club === true || !joueurAuPoste(joueur, slot.position)) continue;
        const evaluation = donneesComparables(joueur, slot.position, role);
        if (evaluation.score === null) { incomplets++; continue; }
        items.push({ joueur, ...evaluation, cout: coutEstime(joueur) });
    }
    return recherchePoste.cache = { data: rawData, signature, items, incomplets };
}

function afficherRecrutementPoste() {
    const cible = document.getElementById("recrutement-poste-view");
    const tactic = tactiqueSelectionnee();
    const id = String(tactic?.id ?? "");
    if (recherchePoste.tactique !== id) {
        recherchePoste.tactique = id;
        recherchePoste.place = "";
        recherchePoste.cache = null;
        recherchePoste.page = 0;
    }
    if (modeDecouverte) {
        if (recherchePoste.mode === "futur") {
            recherchePoste.ages.futur = recherchePoste.age;
            recherchePoste.age = recherchePoste.ages.maintenant;
        }
        recherchePoste.mode = "maintenant";
        if (["pa", "marge", "ca"].includes(recherchePoste.tri)) recherchePoste.tri = "note";
    }
    const slots = tactic ? repartirEffectif(tactic, rawData.joueurs.filter(p => p.est_mon_club === true)) : [];
    if (!slots.some(slot => String(slot.numero) === recherchePoste.place)) recherchePoste.place = slots.length ? String(slots[0].numero) : "";
    const slot = slots.find(item => String(item.numero) === recherchePoste.place);
    const selection = document.getElementById("tactique-select").value;
    let html = `<h2>Recruter par poste</h2><p>Choisissez une tactique et une place, puis comparez les candidats à un joueur de votre effectif.</p>
        <p class="caveat">Scores indicatifs sur les attributs et l’aptitude au poste, pas des notes officielles. Rôles et affectations sont choisis dans l’application ; la tactique active et les titulaires en jeu ne sont pas connus. Les références sélectionnées sont temporaires et réinitialisées au changement de base ou de profil.</p>
        <label>Tactique enregistrée<select id="rp-tactique">${optionsTactiques(selection)}</select></label>`;
    if (!slot) {
        cible.innerHTML = html + "<p>Sélectionnez une tactique comportant des postes reconnus.</p>";
        document.getElementById("rp-tactique").addEventListener("change", changerTactiqueRecherchePoste);
        return;
    }
    const placement = placerPostesTerrain(slots.map(item => ({ slot: item, position: item.position })));
    const markers = placement.places.map(({ slot: item, row, col, x }) => {
        const role = roles[item.roleId].nom;
        const label = `${nomPosteTerrain(item.position, x)} · ${role} · place ${item.numero}`;
        return `<button type="button" class="compact-pitch-slot planner-marker" data-rp-place="${escapeHtml(item.numero)}" style="grid-row:${row};grid-column:${col}" aria-pressed="${String(item.numero) === recherchePoste.place}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${contenuPlaceTerrain(item.position, role, x)}</button>`;
    }).join("");
    const role = roles[slot.roleId];
    const effectif = rawData.joueurs.filter(p => p.est_mon_club === true && joueurAuPoste(p, slot.position));
    const options = effectif.filter(player => player.uid != null).map(player => ({ player, ...donneesComparables(player, slot.position, role) }));
    const meilleur = options.filter(item => item.score !== null).sort((a, b) => b.score - a.score)[0];
    const refKey = `${id}:${slot.numero}`;
    recherchePoste.reference = recherchePoste.references.get(refKey) || "meilleur";
    let ref = recherchePoste.reference === "meilleur" ? meilleur
        : recherchePoste.reference === "titulaire" ? options.find(x => x.player.uid === slot.titulaire?.player.uid)
        : recherchePoste.reference === "doublure" ? options.find(x => x.player.uid === slot.doublure?.player.uid)
        : options.find(x => String(x.player.uid) === recherchePoste.reference);
    const refOptions = options.map(item => `<option value="${escapeHtml(item.player.uid)}"${recherchePoste.reference === String(item.player.uid) ? " selected" : ""}>${escapeHtml(item.player.nom)} · ${item.score === null ? "données incomplètes" : `${item.score.toFixed(1)}/20`}</option>`).join("");
    const cache = candidatsPoste(slot);
    const age = recherchePoste.age === "" ? null : Number(recherchePoste.age);
    const budget = recherchePoste.budget === "" ? null : Number(recherchePoste.budget);
    const paMin = recherchePoste.paMin === "" ? null : Number(recherchePoste.paMin);
    const margeMin = recherchePoste.margeMin === "" ? null : Number(recherchePoste.margeMin);
    const invalide = (age !== null && (!Number.isInteger(age) || age < 0 || age > 100))
        || (budget !== null && (!Number.isFinite(budget) || budget < 0))
        || (recherchePoste.mode === "futur" && [paMin, margeMin].some(n => n !== null && (!Number.isInteger(n) || n < 0 || n > 200)));
    const referenceInvalide = !ref || ref.score === null;
    const sansJoueur = options.length === 0;
    let date = dateJeuUtc(rawData.date_sauvegarde);
    if (date && date.toISOString().slice(0, 10) !== rawData.date_sauvegarde) date = null;
    const limite = date ? new Date(date.getTime()) : null;
    if (limite) limite.setUTCFullYear(limite.getUTCFullYear() + 1);
    let resultats = invalide ? [] : cache.items.filter(item => {
        const p = item.joueur;
        if (recherchePoste.mode === "maintenant" && !sansJoueur && (referenceInvalide || item.score <= ref.score)) return false;
        if (recherchePoste.mode === "futur" && (!estNombre(p.pa) || Number(p.pa) <= 0)) return false;
        if (recherchePoste.mode === "futur" && paMin !== null && Number(p.pa) < paMin) return false;
        if (recherchePoste.mode === "futur" && margeMin !== null && (!estNombre(p.ca) || Number(p.ca) <= 0 || Number(p.pa) - Number(p.ca) < margeMin)) return false;
        if (age !== null && (!estNombre(p.age) || Number(p.age) > age)) return false;
        if (budget !== null && (item.cout === null || item.cout > budget)) return false;
        if (recherchePoste.cout === "connu" && item.cout === null) return false;
        if (recherchePoste.cout === "inconnu" && item.cout !== null) return false;
        if (recherchePoste.contrat === "libre" && p.sous_contrat !== false) return false;
        if (recherchePoste.contrat === "clause" && !clauseSortie(p)) return false;
        if (recherchePoste.contrat === "fin") {
            const fin = dateJeuUtc(p.fin_contrat);
            if (!date || !fin || fin.toISOString().slice(0, 10) !== p.fin_contrat || fin < date || fin > limite) return false;
        }
        return true;
    });
    const tri = recherchePoste.tri;
    const valeurTri = item => tri === "pa" ? (Number(item.joueur.pa) > 0 ? item.joueur.pa : null) : tri === "ca" ? (Number(item.joueur.ca) > 0 ? item.joueur.ca : null) : tri === "marge" ? (estNombre(item.joueur.pa) && Number(item.joueur.pa) > 0 && estNombre(item.joueur.ca) && Number(item.joueur.ca) > 0 ? Number(item.joueur.pa) - Number(item.joueur.ca) : null)
        : tri === "age" ? item.joueur.age : tri === "cout" ? item.cout : item.score;
    resultats.sort((a, b) => {
        const x = valeurTri(a), y = valeurTri(b);
        if (!estNombre(x)) return estNombre(y) ? 1 : 0;
        if (!estNombre(y)) return -1;
        return (tri === "age" || tri === "cout" ? Number(x) - Number(y) : Number(y) - Number(x)) || a.joueur.nom.localeCompare(b.joueur.nom, "fr");
    });
    const total = resultats.length;
    const pages = Math.max(1, Math.ceil(total / 30));
    recherchePoste.page = Math.min(recherchePoste.page, pages - 1);
    const lignes = resultats.slice(recherchePoste.page * 30, (recherchePoste.page + 1) * 30).map(item => {
        const p = item.joueur;
        const pa = estNombre(p.pa) && Number(p.pa) > 0 ? Number(p.pa) : null;
        const ca = estNombre(p.ca) && Number(p.ca) > 0 ? Number(p.ca) : null;
        const differences = ref && ref.score !== null ? role.stats.filter(key => poidsRole(role, key) > 0).map(key => {
            const delta = Number(p.stats[key]) - Number(ref.player.stats[key]);
            return `${nomsStats[key] || key} ${delta > 0 ? "+" : ""}${delta}`;
        }).join(" · ") : "Référence comparable indisponible.";
        return `<tr><td>${linkJoueur(p)} ${ref?.player ? `<button type="button" class="tab-btn" data-rp-comparer="${escapeHtml(p.uid)}">Comparer et suivre</button>` : ""}<details><summary>Expliquer la comparaison</summary><p>${escapeHtml(differences)}</p><p>Aptitude au poste : ${item.aptitude}/20${ref?.aptitude != null ? ` contre ${ref.aptitude}/20` : ""}. Attributs requis et aptitude disponibles.</p></details></td>
            <td>${escapeHtml(p.age ?? "—")}</td><td>${item.aptitude}/20</td><td>${item.score.toFixed(2)}/20</td><td>${ref?.score != null ? `${item.score - ref.score >= 0 ? "+" : ""}${(item.score - ref.score).toFixed(3)}` : "—"}</td>
            ${modeDecouverte ? "" : `<td>${ca ?? "—"}</td><td>${pa ?? "—"}</td><td>${pa !== null && ca !== null ? pa - ca : "—"}</td>`}
            <td>${escapeHtml(p.valeur_marchande == null ? "Inconnue" : formatMoney(p.valeur_marchande))}</td><td>${escapeHtml(item.cout === null ? "Inconnu" : formatMoney(item.cout))}</td><td>${p.sous_contrat === false ? "Libre" : escapeHtml(p.fin_contrat || "Inconnue")}${clauseSortie(p) ? " · clause" : ""}</td></tr>`;
    }).join("");
    html += `<div class="rp-layout"><aside>${cadreTerrain(placement, markers, "Choisir une place tactique")}<p class="profile-disclaimer">Cliquez sur une place pour choisir son poste et son rôle.</p></aside><div>
        <h3>${escapeHtml(nomPoste(slot.position))} · ${escapeHtml(role.nom)} · place ${escapeHtml(slot.numero)}</h3>
        <label>Rôle de cette place<select id="rp-role">${(rolesParPoste[slot.position] || []).map(roleId => `<option value="${escapeHtml(roleId)}"${roleId === slot.roleId ? " selected" : ""}>${escapeHtml(roles[roleId].nom)}</option>`).join("")}</select></label>
        <label>Joueur de référence<select id="rp-reference"><option value="meilleur"${recherchePoste.reference === "meilleur" ? " selected" : ""}>Meilleur joueur évaluable au poste</option><option value="titulaire"${recherchePoste.reference === "titulaire" ? " selected" : ""}>Titulaire affecté indicativement</option><option value="doublure"${recherchePoste.reference === "doublure" ? " selected" : ""}>Doublure affectée indicativement</option>${refOptions}</select></label>
        <p>${ref ? `${linkJoueur(ref.player)} · ${ref.score === null ? "données incomplètes : " + escapeHtml(ref.absents.map(x => nomsStats[x] || x).join(", ")) : `${ref.score.toFixed(1)}/20`}` : "Aucun joueur évaluable pour cette référence."}</p>
        <div class="filter-bar"><button type="button" class="tab-btn${recherchePoste.mode === "maintenant" ? " active" : ""}" data-rp-mode="maintenant">Meilleur immédiatement</button>${modeDecouverte ? "" : `<button type="button" class="tab-btn${recherchePoste.mode === "futur" ? " active" : ""}" data-rp-mode="futur">Futurs talents</button>`}</div>
        <p class="caveat">${recherchePoste.mode === "futur" ? "PA = potentiel global, marge = PA − CA : ni garantie de progression, ni note future du rôle." : sansJoueur ? "Sans joueur du club au poste, les profils évaluables sont affichés sans comparaison." : "Seuls les candidats strictement mieux notés que la référence sont retenus."} Le prix demandé, le salaire exigé et l’intérêt du joueur sont inconnus. La marge de réputation de la liste Joueurs ne s’applique pas ici ; le budget ci-dessous est indépendant.</p>
        <div class="decision-controls"><label>Âge maximum<input id="rp-age" type="number" min="0" max="100" step="1" value="${escapeHtml(recherchePoste.age)}" placeholder="Sans limite"></label><label>Budget maximum (€)<input id="rp-budget" type="number" min="0" step="1" value="${escapeHtml(recherchePoste.budget)}" placeholder="Sans limite"></label>
        ${recherchePoste.mode === "futur" ? `<label>PA minimum<input id="rp-paMin" type="number" min="0" max="200" step="1" value="${escapeHtml(recherchePoste.paMin)}" placeholder="Sans minimum"></label><label>Marge PA − CA minimum<input id="rp-margeMin" type="number" min="0" max="200" step="1" value="${escapeHtml(recherchePoste.margeMin)}" placeholder="Sans minimum"></label>` : ""}
        <label>Contrat<select id="rp-contrat"><option value="tous">Tous</option><option value="libre">Agents libres</option><option value="fin">Fin dans 12 mois</option><option value="clause">Clause de sortie</option></select></label>
        <label>Coût estimé<select id="rp-cout"><option value="tous">Connus et inconnus</option><option value="connu">Coût connu</option><option value="inconnu">Coût inconnu uniquement</option></select></label>
        <label>Trier par<select id="rp-tri"><option value="note">Note de rôle</option>${modeDecouverte ? "" : '<option value="ca">Niveau global (CA)</option><option value="pa">Potentiel global (PA)</option><option value="marge">Marge PA − CA</option>'}<option value="age">Âge croissant</option><option value="cout">Coût croissant</option></select></label></div>
        <p class="caveat">Un budget exclut les coûts inconnus. La clause est conditionnelle ; le coût utilise la clause ou une estimation de valeur, pas le prix demandé. Fin de contrat calculée depuis la date de sauvegarde.</p>
        <p role="status">${invalide ? "Vérifiez les bornes d’âge, de budget, de PA et de marge." : recherchePoste.contrat === "fin" && !date ? "Date de sauvegarde inconnue : filtre de fin de contrat indisponible." : recherchePoste.mode === "maintenant" && !sansJoueur && referenceInvalide ? "Choisissez une référence avec tous les attributs du rôle et l’aptitude au poste." : `${total.toLocaleString("fr-FR")} résultat(s) · ${cache.incomplets.toLocaleString("fr-FR")} candidat(s) exclus pour données incomplètes.`}</p>
        <div class="rp-table"><table><thead><tr><th>Joueur et explication</th><th>Âge</th><th>Poste</th><th>Rôle</th><th>Écart</th>${modeDecouverte ? "" : "<th>CA</th><th>PA</th><th>PA − CA</th>"}<th>Valeur</th><th>Coût estimé</th><th>Contrat</th></tr></thead><tbody>${lignes || `<tr><td colspan="${modeDecouverte ? 8 : 11}">Aucun résultat avec ces critères.</td></tr>`}</tbody></table></div>
        <div class="filter-bar"><button class="tab-btn" id="rp-prev" type="button"${recherchePoste.page === 0 ? " disabled" : ""}>Précédent</button><span>Page ${recherchePoste.page + 1} / ${pages}</span><button class="tab-btn" id="rp-next" type="button"${recherchePoste.page >= pages - 1 ? " disabled" : ""}>Suivant</button></div></div></div>`;
    cible.innerHTML = html;
    cible.querySelectorAll("[data-rp-comparer]").forEach(button => button.addEventListener("click", () => {
        try {
            const joueur = rawData.joueurs.find(item => String(item.uid) === button.dataset.rpComparer);
            AssistantFMSuivi.comparerJoueurs(joueur, ref?.player, slot.position, slot.roleId);
        } catch (error) {
            cible.querySelector("[role=status]").textContent = `Comparaison impossible : ${error.message}`;
        }
    }));
    cible.querySelectorAll('[data-profile-kind="joueur"]').forEach(button => {
        button.dataset.profilePosition = slot.position;
        button.dataset.profileRole = slot.roleId;
    });
    document.getElementById("rp-tactique").addEventListener("change", changerTactiqueRecherchePoste);
    cible.querySelectorAll("[data-rp-place]").forEach(button => button.addEventListener("click", () => {
        recherchePoste.place = button.dataset.rpPlace; recherchePoste.page = 0; afficherRecrutementPoste();
        cible.querySelector("[data-rp-place][aria-pressed=true]")?.focus();
    }));
    document.getElementById("rp-reference").addEventListener("change", event => {
        recherchePoste.references.set(refKey, event.target.value); recherchePoste.page = 0; afficherRecrutementPoste();
    });
    document.getElementById("rp-role").addEventListener("change", event => {
        (tacticalRoles[tactic.id] || (tacticalRoles[tactic.id] = {}))[slot.numero] = event.target.value;
        recherchePoste.page = 0;
        afficherRecrutementPoste();
    });
    cible.querySelectorAll("[data-rp-mode]").forEach(button => button.addEventListener("click", () => {
        recherchePoste.ages[recherchePoste.mode] = recherchePoste.age;
        recherchePoste.mode = button.dataset.rpMode; recherchePoste.age = recherchePoste.ages[recherchePoste.mode];
        recherchePoste.tri = recherchePoste.mode === "futur" ? "pa" : "note"; recherchePoste.page = 0; afficherRecrutementPoste();
    }));
    for (const name of ["age", "budget", "contrat", "cout", "tri", ...(recherchePoste.mode === "futur" ? ["paMin", "margeMin"] : [])]) {
        const input = document.getElementById(`rp-${name}`);
        input.value = recherchePoste[name];
        input.addEventListener("change", () => { recherchePoste[name] = input.value; recherchePoste.page = 0; afficherRecrutementPoste(); });
    }
    document.getElementById("rp-prev").addEventListener("click", () => { recherchePoste.page--; afficherRecrutementPoste(); });
    document.getElementById("rp-next").addEventListener("click", () => { recherchePoste.page++; afficherRecrutementPoste(); });
}

function changerTactiqueRecherchePoste(event) {
    document.getElementById("tactique-select").value = event.target.value;
    afficherTactiqueDetail();
    afficherRecrutementPoste();
}
