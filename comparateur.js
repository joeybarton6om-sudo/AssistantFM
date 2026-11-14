let comparateurSelection = new Set();
let comparateurPoste = "dc";
let comparateurRole = "";
let comparateurReference = "";
let comparateurRecherche = "";
let comparateurMonte = false;

const statutsSuivi = {
    a_suivre: "À suivre",
    a_contacter: "À contacter",
    negociation: "En négociation",
    signe: "Signé"
};

const couleursComparateur = ["#5b9bd5", "#e07a5f", "#81b29a", "#f2cc8f"];

function cleComparateur(player) {
    const id = player?.unique_id ?? player?.uid;
    return id != null && String(id).trim() !== "" ? String(id) : String(player?.nom || "");
}

function joueursComparateur() {
    return Array.isArray(rawData.joueurs) ? rawData.joueurs : [];
}

function joueursSelectionnes() {
    return [...comparateurSelection]
        .map(cle => joueursComparateur().find(player => cleComparateur(player) === cle))
        .filter(Boolean);
}

function comparateurRadar(joueurs, role, poste) {
    const stats = role?.stats || [];
    if (!joueurs.length) return "<p class=\"caveat\">Sélectionnez au moins un joueur pour afficher le radar.</p>";
    if (!stats.length) return "<p class=\"caveat\">Choisissez un rôle pour afficher le radar.</p>";
    const taille = 300, cx = 150, cy = 142, rayon = 96;
    const angle = index => -Math.PI / 2 + index * 2 * Math.PI / stats.length;
    const point = (index, valeur) => {
        const ratio = Math.max(0, Math.min(20, Number(valeur) || 0)) / 20;
        return [cx + Math.cos(angle(index)) * rayon * ratio, cy + Math.sin(angle(index)) * rayon * ratio];
    };
    const polygone = ratio => stats.map((_, index) => {
        const x = cx + Math.cos(angle(index)) * rayon * ratio;
        const y = cy + Math.sin(angle(index)) * rayon * ratio;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const grille = [0.25, 0.5, 0.75, 1].map(ratio =>
        `<polygon points="${polygone(ratio)}" fill="none" stroke="#2c4055" stroke-width="1"/>`
    ).join("");
    const axes = stats.map((_, index) => {
        const x = cx + Math.cos(angle(index)) * rayon;
        const y = cy + Math.sin(angle(index)) * rayon;
        return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#2c4055" stroke-width="1"/>`;
    }).join("");
    const labels = stats.map((key, index) => {
        const x = cx + Math.cos(angle(index)) * (rayon + 20);
        const y = cy + Math.sin(angle(index)) * (rayon + 20);
        const anchor = Math.abs(Math.cos(angle(index))) < 0.2 ? "middle" : Math.cos(angle(index)) > 0 ? "start" : "end";
        return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#b7c4d2" font-size="10" text-anchor="${anchor}" dominant-baseline="middle">${escapeHtml(nomsStats[key] || key)}</text>`;
    }).join("");
    const series = joueurs.map((joueur, index) => {
        const couleur = couleursComparateur[index % couleursComparateur.length];
        const points = stats.map((key, i) => point(i, joueur.stats?.[key]).map(valeur => valeur.toFixed(1)).join(",")).join(" ");
        return `<polygon points="${points}" fill="${couleur}" fill-opacity="0.12" stroke="${couleur}" stroke-width="2"/>`;
    }).join("");
    const legende = joueurs.map((joueur, index) =>
        `<span class="comparateur-legende-item"><i style="background:${couleursComparateur[index % couleursComparateur.length]}"></i>${escapeHtml(joueur.nom)}</span>`
    ).join("");
    return `<svg viewBox="0 0 ${taille} ${taille}" class="comparateur-radar" role="img" aria-label="Radar des attributs du rôle">${grille}${axes}${labels}${series}</svg>
        <div class="comparateur-legende">${legende}</div>`;
}

function comparateurTable(joueurs, role, poste, referenceId) {
    if (!joueurs.length) return "<p class=\"caveat\">Aucun joueur sélectionné.</p>";
    const reference = joueurs.find(joueur => cleComparateur(joueur) === referenceId) || joueurs[0];
    const indexReference = joueurs.indexOf(reference);
    const cellule = value => escapeHtml(value == null || value === "" ? "—" : value);
    const money = value => value == null || value === "" ? "—" : formatMoney(value);
    const ligne = (label, valeurs) => `<tr><th scope="row">${escapeHtml(label)}</th>${valeurs.map(value => `<td>${cellule(value)}</td>`).join("")}</tr>`;
    const ligneEcart = (label, valeurs) => `<tr><th scope="row">${escapeHtml(label)}</th>${valeurs.map((value, index) => {
        if (!estNombre(value)) return "<td>—</td>";
        const ancien = estNombre(valeurs[indexReference]) ? Number(valeurs[indexReference]) : null;
        const delta = index === indexReference || ancien === null ? null : Number(value) - ancien;
        const classe = delta > 0 ? "comparison-better" : delta < 0 ? "comparison-worse" : "";
        const suffixe = index === indexReference ? " · référence" : delta === null ? "" : ` (${delta > 0 ? "+" : ""}${Number(delta.toFixed(2))})`;
        return `<td class="${classe}">${escapeHtml(value)}${escapeHtml(suffixe)}</td>`;
    }).join("")}</tr>`;
    const attributs = role ? role.stats : [];
    const lignesAttributs = attributs.map(key => ligneEcart(nomsStats[key] || key, joueurs.map(joueur => {
        const valeur = joueur.stats?.[key];
        return estNombre(valeur) ? Number(valeur) : "—";
    }))).join("");
    return `<div class="scroll"><table><thead><tr><th scope="col">Critère</th>${joueurs.map(joueur => `<th scope="col">${cellule(joueur.nom)}</th>`).join("")}</tr></thead><tbody>
        ${ligne("Club", joueurs.map(joueur => joueur.club))}
        ${ligne("Âge", joueurs.map(joueur => joueur.age))}
        ${ligne("CA", joueurs.map(joueur => joueur.ca))}
        ${ligne("PA", joueurs.map(joueur => joueur.pa))}
        ${ligne("Valeur marchande", joueurs.map(joueur => money(joueur.valeur_marchande)))}
        ${ligne("Coût estimé", joueurs.map(joueur => money(coutEstime(joueur))))}
        ${ligne("Fin du contrat", joueurs.map(joueur => joueur.fin_contrat))}
        ${ligne("Salaire hebdomadaire", joueurs.map(joueur => money(joueur.salaire_hebdomadaire)))}
        ${ligne("Statut", joueurs.map(joueur => traduireStatutEffectif(joueur.statut_effectif || (joueur.sous_contrat === false ? "sans_contrat" : ""))))}
        ${ligneEcart("Maîtrise du poste", joueurs.map(joueur => estNombre(joueur.positions?.[poste]) ? Number(joueur.positions[poste]) : null))}
        ${ligneEcart("Score de rôle", joueurs.map(joueur => {
            const valeur = role ? noteRole(joueur, role, poste) : null;
            return Number.isFinite(valeur) ? Number(valeur.toFixed(2)) : null;
        }))}
        ${lignesAttributs}</tbody></table></div>`;
}

function celluleCsv(value) {
    const texte = String(value ?? "");
    return /[";\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

function comparateurCsv(joueurs, role, poste, referenceId) {
    const lignes = [["Critère", ...joueurs.map(joueur => joueur.nom)]];
    const ajouter = (label, valeurs) => lignes.push([label, ...valeurs.map(valeur => valeur == null || valeur === "" ? "" : String(valeur))]);
    ajouter("Club", joueurs.map(joueur => joueur.club));
    ajouter("Âge", joueurs.map(joueur => joueur.age));
    ajouter("CA", joueurs.map(joueur => joueur.ca));
    ajouter("PA", joueurs.map(joueur => joueur.pa));
    ajouter("Valeur marchande", joueurs.map(joueur => joueur.valeur_marchande));
    ajouter("Coût estimé", joueurs.map(joueur => coutEstime(joueur)));
    ajouter("Fin du contrat", joueurs.map(joueur => joueur.fin_contrat));
    ajouter("Salaire hebdomadaire", joueurs.map(joueur => joueur.salaire_hebdomadaire));
    ajouter("Poste", joueurs.map(joueur => afficherPoste(joueur)));
    ajouter("Score de rôle", joueurs.map(joueur => {
        const valeur = role ? noteRole(joueur, role, poste) : null;
        return Number.isFinite(valeur) ? valeur.toFixed(2) : "";
    }));
    (role?.stats || []).forEach(key => ajouter(nomsStats[key] || key, joueurs.map(joueur => joueur.stats?.[key])));
    return lignes.map(ligne => ligne.map(celluleCsv).join(";")).join("\r\n");
}

function telechargerCsv(nom, contenu) {
    try {
        const blob = new Blob(["\uFEFF" + contenu], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const lien = document.createElement("a");
        lien.href = url;
        lien.download = nom;
        lien.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    } catch (error) {
        window.open("data:text/csv;charset=utf-8," + encodeURIComponent(contenu));
        return false;
    }
}

function optionsPosteComparateur() {
    const disponibles = Object.keys(rolesParPoste).filter(id => postes[id] && (rolesParPoste[id] || []).length);
    if (!disponibles.includes(comparateurPoste)) comparateurPoste = disponibles[0] || "dc";
    return disponibles.map(id =>
        `<option value="${escapeHtml(id)}"${id === comparateurPoste ? " selected" : ""}>${escapeHtml(postes[id])}</option>`).join("");
}

function optionsRoleComparateur() {
    const rolesDisponibles = rolesParPoste[comparateurPoste] || [];
    if (!rolesDisponibles.includes(comparateurRole)) comparateurRole = rolesDisponibles[0] || "";
    return rolesDisponibles.map(id =>
        `<option value="${escapeHtml(id)}"${id === comparateurRole ? " selected" : ""}>${escapeHtml(roles[id]?.nom || id)}</option>`).join("");
}

function afficherComparateur() {
    const target = document.getElementById("comparateur-view");
    if (!target) return;
    if (!Array.isArray(rawData.joueurs) || !rawData.joueurs.length) {
        target.innerHTML = "<h2>Comparateur de joueurs</h2><p>Chargez une sauvegarde pour comparer des joueurs.</p>";
        return;
    }
    const selectionnes = joueursSelectionnes();
    if (selectionnes.length && !selectionnes.some(joueur => cleComparateur(joueur) === comparateurReference)) {
        comparateurReference = cleComparateur(selectionnes[0]);
    }
    const role = roles[comparateurRole];
    const recherche = comparateurRecherche.trim().toLocaleLowerCase("fr");
    const filtres = joueursComparateur()
        .filter(joueur => !recherche || [joueur.nom, joueur.club, afficherPoste(joueur)]
            .some(valeur => String(valeur ?? "").toLocaleLowerCase("fr").includes(recherche)))
        .sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"))
        .slice(0, 60);
    const picker = filtres.map(joueur => {
        const cle = cleComparateur(joueur);
        const coche = comparateurSelection.has(cle);
        return `<label class="comparateur-picker-item"><input type="checkbox" data-comparateur-player="${escapeHtml(cle)}"${coche ? " checked" : ""}${!coche && comparateurSelection.size >= 4 ? " disabled" : ""}>
            <span>${escapeHtml(joueur.nom)}</span><small>${escapeHtml(afficherPoste(joueur))} · ${escapeHtml(joueur.club || "—")}</small></label>`;
    }).join("") || "<p class=\"caveat\">Aucun joueur ne correspond.</p>";
    target.innerHTML = `<h2>Comparateur de joueurs</h2>
        <p class="caveat">Comparez 2 à 4 joueurs sur un poste et un rôle. Le radar et les écarts utilisent les attributs disponibles ; les données manquantes ne sont pas comptées comme zéro. Export CSV disponible.</p>
        <div class="comparateur-layout">
            <div class="dashboard-card"><h3>Joueurs</h3>
                <label>Recherche<input id="comparateur-recherche" data-comparateur-recherche type="search" value="${escapeHtml(comparateurRecherche)}" placeholder="Nom, club, poste..."></label>
                <div class="comparateur-picker">${picker}</div>
                <button type="button" data-comparateur-clear>Vider la sélection</button>
                <button type="button" data-comparateur-suivi>Ajouter depuis le suivi</button>
            </div>
            <div class="dashboard-card"><h3>Critères</h3>
                <div class="profile-controls">
                    <label>Poste<select data-comparateur-poste>${optionsPosteComparateur()}</select></label>
                    <label>Rôle<select data-comparateur-role>${optionsRoleComparateur()}</select></label>
                    <label>Référence<select data-comparateur-reference>${selectionnes.map(joueur => `<option value="${escapeHtml(cleComparateur(joueur))}"${cleComparateur(joueur) === comparateurReference ? " selected" : ""}>${escapeHtml(joueur.nom)}</option>`).join("") || "<option value=\"\">Aucun joueur</option>"}</select></label>
                </div>
                ${selectionnes.length ? `<ul class="comparateur-selection">${selectionnes.map(joueur => `<li><span>${escapeHtml(joueur.nom)}</span><button type="button" class="tab-btn" data-comparateur-joueur="${escapeHtml(cleComparateur(joueur))}">Ajouter au suivi</button></li>`).join("")}</ul>` : ""}
                <p>${selectionnes.length} joueur(s) sélectionné(s) sur 4 maximum.</p>
                <button type="button" data-comparateur-export${selectionnes.length < 2 ? " disabled" : ""}>Exporter le CSV</button>
                <p data-comparateur-status role="status"></p>
            </div>
        </div>
        <div class="comparateur-results">
            ${comparateurRadar(selectionnes, role, comparateurPoste)}
            ${comparateurTable(selectionnes, role, comparateurPoste, comparateurReference)}
        </div>`;
    monterComparateur();
}

function majSelectionComparateur(cle, coche) {
    if (coche && comparateurSelection.size >= 4 && !comparateurSelection.has(cle)) {
        throw new Error("Vous pouvez comparer au maximum 4 joueurs.");
    }
    if (coche) comparateurSelection.add(cle); else comparateurSelection.delete(cle);
}

function comparateurClic(event) {
    const target = event.target.closest("[data-comparateur-clear], [data-comparateur-export], [data-comparateur-suivi], [data-comparateur-joueur]");
    if (!target) return;
    try {
        if (target.hasAttribute("data-comparateur-clear")) {
            comparateurSelection.clear();
            comparateurReference = "";
            afficherComparateur();
        } else if (target.hasAttribute("data-comparateur-export")) {
            const selectionnes = joueursSelectionnes();
            const role = roles[comparateurRole];
            if (selectionnes.length < 2) throw new Error("Sélectionnez au moins 2 joueurs.");
            telechargerCsv(`comparateur-${comparateurPoste}-${comparateurRole || "role"}.csv`,
                comparateurCsv(selectionnes, role, comparateurPoste, comparateurReference));
            const status = document.querySelector("[data-comparateur-status]");
            if (status) status.textContent = "Export CSV généré.";
        } else if (target.hasAttribute("data-comparateur-suivi")) {
            const cibles = (window.AssistantFMSuivi?.liste() || []).map(item => item.joueur).filter(Boolean);
            if (!cibles.length) throw new Error("Aucun joueur dans le suivi.");
            comparateurSelection = new Set(cibles.slice(0, 4).map(cleComparateur));
            comparateurReference = "";
            afficherComparateur();
        } else if (target.hasAttribute("data-comparateur-joueur")) {
            const joueur = joueursComparateur().find(item => cleComparateur(item) === target.getAttribute("data-comparateur-joueur"));
            if (joueur) {
                window.AssistantFMSuivi.ajouter(joueur);
                const status = document.querySelector("[data-comparateur-status]");
                if (status) status.textContent = "Joueur ajouté au suivi.";
            }
        }
    } catch (error) {
        const status = document.querySelector("[data-comparateur-status]");
        if (status) status.textContent = error.message;
    }
}

function comparateurChangement(event) {
    const element = event.target;
    try {
        if (element.hasAttribute("data-comparateur-player")) {
            majSelectionComparateur(element.getAttribute("data-comparateur-player"), element.checked);
            comparateurReference = "";
            afficherComparateur();
        } else if (element.hasAttribute("data-comparateur-poste")) {
            comparateurPoste = element.value;
            comparateurRole = "";
            afficherComparateur();
        } else if (element.hasAttribute("data-comparateur-role")) {
            comparateurRole = element.value;
            afficherComparateur();
        } else if (element.hasAttribute("data-comparateur-reference")) {
            comparateurReference = element.value;
            afficherComparateur();
        }
    } catch (error) {
        const status = document.querySelector("[data-comparateur-status]");
        if (status) status.textContent = error.message;
    }
}

function comparateurInput(event) {
    if (!event.target.hasAttribute("data-comparateur-recherche")) return;
    comparateurRecherche = event.target.value;
    afficherComparateur();
    const champ = document.getElementById("comparateur-recherche");
    if (champ) {
        champ.focus();
        champ.setSelectionRange(champ.value.length, champ.value.length);
    }
}

function monterComparateur() {
    const target = document.getElementById("comparateur-view");
    if (!target || comparateurMonte) return;
    comparateurMonte = true;
    target.addEventListener("click", comparateurClic);
    target.addEventListener("change", comparateurChangement);
    target.addEventListener("input", comparateurInput);
}

const Comparateur = {
    cle: cleComparateur,
    joueurs: joueursComparateur,
    selection: () => [...comparateurSelection],
    selectionner: valeurs => { comparateurSelection = new Set(Array.isArray(valeurs) ? valeurs : []); comparateurReference = ""; },
    radar: comparateurRadar,
    table: comparateurTable,
    csv: comparateurCsv,
    telechargerCsv,
    afficher: afficherComparateur,
    monter: monterComparateur,
    statuts: statutsSuivi
};

if (typeof window !== "undefined") {
    window.Comparateur = Comparateur;
    window.afficherComparateur = afficherComparateur;
}