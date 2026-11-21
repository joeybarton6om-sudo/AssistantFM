function libellePerformance(kind) {
    return ({overall: "Total saison", calendar_year_overall: "Total année civile", league: "Championnat",
        cup: "Coupe", continental: "Continental", non_competitive: "Non compétitif", international: "International",
        calendar_year_international: "International · année civile"})[kind] || kind || "—";
}

function faireTri(tableId, getLignes, getValeurCellule, render) {
    let sortCol = 3;
    let sortAsc = false;
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll("th[data-sort]").forEach((th, index) => {
        th.style.cursor = "pointer";
        th.title = "Cliquer pour trier";
        th.addEventListener("click", () => {
            if (sortCol === index) sortAsc = !sortAsc;
            else { sortCol = index; sortAsc = false; }
            render();
        });
    });
    const comparer = (a, b) => {
        const va = getValeurCellule(a, sortCol);
        const vb = getValeurCellule(b, sortCol);
        if (typeof va === "number") return sortAsc ? va - vb : vb - va;
        const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
        return sortAsc ? sa.localeCompare(sb) : sb.localeCompare(sa);
    };
    return { comparer };
}

function afficherPerformances() {
    const target = document.getElementById("performances-view");
    const lignes = rawData.statistiques_saison;
    if (!Array.isArray(lignes) || lignes.length === 0) {
        if (rawData.erreur_statistiques_saison) {
            target.innerHTML = `<h2>Performances de l’effectif</h2><p role="alert">Lecture des statistiques impossible : ${escapeHtml(rawData.erreur_statistiques_saison)}</p>`;
        } else {
            target.innerHTML = afficherPerformancesFallback();
        }
        return;
    }
    const version = rawData.version_jeu || {};
    const options = [...new Set(lignes.map(row => row.kind).filter(Boolean))].sort();
    const defaultKind = options.includes("overall") ? "overall" : "";
    target.innerHTML = `<h2>Performances de l’effectif</h2>
        <p class="caveat"><strong>Données expérimentales à vérifier dans le jeu.</strong> Version ${escapeHtml(version.build || "inconnue")} ; les champs FM27 ne sont pas confirmés par l’extracteur. Le total de saison est affiché par défaut s’il existe ; les types et équipes restent distincts et ne sont pas additionnés. « Tous les types » peut afficher plusieurs lignes par joueur. Ces chiffres ne sont pas utilisés pour recommander des joueurs.</p>
        <label>Compétition : <select id="performances-kind"><option value="">Tous les types</option>${options.map(kind => `<option value="${escapeHtml(kind)}"${kind === defaultKind ? " selected" : ""}>${escapeHtml(libellePerformance(kind))}</option>`).join("")}</select></label>
        <label>Minutes minimum : <input id="performances-minutes" type="number" min="0" step="1" value="450" style="width:100px"></label>
        <p id="performances-status" role="status"></p><div class="scroll"><table id="performances-table"><thead><tr><th data-sort="text">Joueur</th><th data-sort="text">Type</th><th data-sort="text">Équipe</th><th data-sort="number">Minutes</th><th data-sort="number">Matchs titulaires</th><th data-sort="number">Entrées</th><th data-sort="number">Note moyenne</th></tr></thead><tbody id="performances-tbody"></tbody></table></div>`;
    const joueurs = new Map(rawData.joueurs.map(player => [String(player.uid), player]));
    const { comparer } = faireTri("performances-table",
        () => lignes,
        (row, index) => {
            const cells = ["joueur", "kind", "team_slot", "minutes", "starts", "substitute_appearances", "average_rating"];
            const cle = cells[index];
            switch (cle) {
                case "joueur": return rawData.joueurs.find(p => String(p.uid) === String(row.player_uid))?.nom || row.player_name || "";
                case "kind": return libellePerformance(row.kind);
                case "team_slot": return row.team_slot == null ? "" : String(Number(row.team_slot) + 1);
                case "minutes": return Number(row.minutes) || 0;
                case "starts": return Number(row.starts ?? 0);
                case "substitute_appearances": return Number(row.substitute_appearances ?? 0);
                case "average_rating": return Number(row.average_rating) || 0;
                default: return "";
            }
        },
        null);
    const update = () => {
        const minimum = document.getElementById("performances-minutes");
        const status = document.getElementById("performances-status");
        const body = document.getElementById("performances-tbody");
        if (!minimum.checkValidity() || minimum.value === "") {
            status.textContent = "Indiquez un nombre de minutes valide.";
            body.replaceChildren();
            return;
        }
        const kind = document.getElementById("performances-kind").value;
        let data = lignes.filter(row => (!kind || row.kind === kind) && estNombre(row.minutes)
            && Number(row.minutes) >= Number(minimum.value));
        data.sort(comparer);
        status.textContent = `${data.length} ligne(s) disponibles.`;
        body.innerHTML = data.map(row => {
            const player = joueurs.get(String(row.player_uid));
            const note = estNombre(row.average_rating) ? Number(row.average_rating).toFixed(2) : "—";
            return `<tr><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${player ? linkJoueur(player) : escapeHtml(row.player_name || "Joueur non associé")}</td><td>${escapeHtml(libellePerformance(row.kind))}</td><td>${escapeHtml(row.team_slot == null ? "—" : Number(row.team_slot) + 1)}</td><td>${escapeHtml(row.minutes)}</td><td>${escapeHtml(row.starts ?? "—")}</td><td>${escapeHtml(row.substitute_appearances ?? "—")}</td><td>${note}</td></tr>`;
        }).join("");
    };
    document.getElementById("performances-kind").addEventListener("change", update);
    document.getElementById("performances-minutes").addEventListener("input", update);
    update();
}

function afficherPerformancesFallback() {
    const tousJoueurs = Array.isArray(rawData.joueurs) ? rawData.joueurs : [];
    const joueurs = tousJoueurs.filter(j => j.est_mon_club === true);
    const tri = joueurs.slice().sort((a, b) => {
        const caA = Number(a.ca || 0);
        const caB = Number(b.ca || 0);
        return caB - caA;
    });
    const lignes = tri.map(j => {
        const hist = Array.isArray(j.historique_carriere) ? j.historique_carriere : [];
        const derniere = hist.length > 0 ? hist[hist.length - 1] : null;
        const note = estNombre(j.ca) ? Number(j.ca).toFixed(1) : "—";
        const minutes = derniere && estNombre(derniere.minutes_played) ? Number(derniere.minutes_played).toLocaleString("fr-FR") : "—";
        const matches = derniere && estNombre(derniere.matches_played) ? Number(derniere.matches_played) : "—";
        const starts = derniere && estNombre(derniere.starts) ? Number(derniere.starts) : "—";
        const subs = derniere && estNombre(derniere.sub_appearances) ? Number(derniere.sub_appearances) : "—";
        const saison = derniere ? (derniere.season || "Saison") : "—";
        return `<tr><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${linkJoueur(j)} <span style="font-size:0.85em;color:#888;">(${saison})</span></td><td>—</td><td>—</td><td>${minutes}</td><td>${starts}</td><td>${subs}</td><td>${note}</td></tr>`;
    }).join("");
    const avecStats = tri.filter(j => Array.isArray(j.historique_carriere) && j.historique_carriere.length > 0).length;
    return `<h2>Performances de l’effectif</h2>
        <p class="caveat"><strong>Statistiques de saison indisponibles pour FM27.</strong> Affichage indicatif de votre effectif basé sur l’historique de carrière (dernière saison connue), trié par CA décroissant.</p>
        <div class="scroll"><table id="performances-table-fallback"><thead><tr><th data-sort="text">Joueur</th><th data-sort="text">Type</th><th data-sort="text">Équipe</th><th data-sort="number">Minutes</th><th data-sort="number">Matchs titulaires</th><th data-sort="number">Entrées</th><th data-sort="number">CA</th></tr></thead><tbody>${lignes}</tbody></table></div>
        <p class="caveat">${joueurs.length} joueur(s) dans votre effectif, ${avecStats} avec historique de carrière disponible. Les colonnes de match proviennent de la dernière saison connue, pas de la saison en cours.</p>`;
}

document.addEventListener("DOMContentLoaded", () => {
    const table = document.getElementById("performances-table-fallback");
    if (!table) return;
    let sortCol = 3, sortAsc = false;
    table.querySelectorAll("th[data-sort]").forEach((th, index) => {
        th.style.cursor = "pointer";
        th.title = "Cliquer pour trier";
        th.addEventListener("click", () => {
            if (sortCol === index) sortAsc = !sortAsc;
            else { sortCol = index; sortAsc = false; }
            const tbody = table.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));
            const getCell = (row, idx) => {
                const txt = row.children[idx].textContent.trim();
                if (idx === 3 || idx === 4 || idx === 5 || idx === 6) return Number(txt.replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
                return txt.toLowerCase();
            };
            rows.sort((a, b) => {
                const va = getCell(a, sortCol);
                const vb = getCell(b, sortCol);
                if (typeof va === "number") return sortAsc ? va - vb : vb - va;
                return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            });
            rows.forEach(row => tbody.appendChild(row));
        });
    });
});
