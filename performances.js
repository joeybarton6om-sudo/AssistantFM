function libellePerformance(kind) {
    return ({overall: "Total saison", calendar_year_overall: "Total année civile", league: "Championnat",
        cup: "Coupe", continental: "Continental", non_competitive: "Non compétitif", international: "International",
        calendar_year_international: "International · année civile"})[kind] || kind || "—";
}

function afficherPerformances() {
    const target = document.getElementById("performances-view");
    const lignes = rawData.statistiques_saison;
    if (!Array.isArray(lignes)) {
        target.innerHTML = rawData.erreur_statistiques_saison
            ? `<h2>Performances de l’effectif</h2><p role="alert">Lecture des statistiques impossible : ${escapeHtml(rawData.erreur_statistiques_saison)}</p>`
            : "<h2>Performances de l’effectif</h2><p>Cette base ne contient pas les statistiques de saison. Réextrayez la sauvegarde avec le serveur à jour.</p>";
        return;
    }
    const version = rawData.version_jeu || {};
    const options = [...new Set(lignes.map(row => row.kind).filter(Boolean))].sort();
    const defaultKind = options.includes("overall") ? "overall" : "";
    target.innerHTML = `<h2>Performances de l’effectif</h2>
        <p class="caveat"><strong>Données expérimentales à vérifier dans le jeu.</strong> Version ${escapeHtml(version.build || "inconnue")} ; les champs FM27 ne sont pas confirmés par l’extracteur. Le total de saison est affiché par défaut s’il existe ; les types et équipes restent distincts et ne sont pas additionnés. « Tous les types » peut afficher plusieurs lignes par joueur. Ces chiffres ne sont pas utilisés pour recommander des joueurs.</p>
        <label>Compétition : <select id="performances-kind"><option value="">Tous les types</option>${options.map(kind => `<option value="${escapeHtml(kind)}"${kind === defaultKind ? " selected" : ""}>${escapeHtml(libellePerformance(kind))}</option>`).join("")}</select></label>
        <label>Minutes minimum : <input id="performances-minutes" type="number" min="0" step="1" value="450" style="width:100px"></label>
        <p id="performances-status" role="status"></p><div class="scroll"><table><thead><tr><th>Joueur</th><th>Type</th><th>Équipe</th><th>Minutes</th><th>Matchs titulaires</th><th>Entrées</th><th>Note moyenne</th><th>Buts</th><th>Passes déc.</th><th>Buts / 90</th><th>Passes / 90</th></tr></thead><tbody id="performances-tbody"></tbody></table></div>`;
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
        const joueurs = new Map(rawData.joueurs.map(player => [String(player.uid), player]));
        const data = lignes.filter(row => (!kind || row.kind === kind) && estNombre(row.minutes)
            && Number(row.minutes) >= Number(minimum.value)).sort((a, b) => Number(b.minutes) - Number(a.minutes));
        status.textContent = `${data.length} ligne(s) disponibles. Les taux par 90 minutes sont indicatifs et sensibles au faible temps de jeu.`;
        body.innerHTML = data.map(row => {
            const player = joueurs.get(String(row.player_uid));
            const taux = value => estNombre(value) && Number(row.minutes) > 0
                ? (Number(value) * 90 / Number(row.minutes)).toFixed(2) : "—";
            const note = estNombre(row.average_rating) ? Number(row.average_rating).toFixed(2) : "—";
            return `<tr><td>${player ? linkJoueur(player) : escapeHtml(row.player_name || "Joueur non associé")}</td><td>${escapeHtml(libellePerformance(row.kind))}</td><td>${escapeHtml(row.team_slot == null ? "—" : Number(row.team_slot) + 1)}</td><td>${escapeHtml(row.minutes)}</td><td>${escapeHtml(row.starts ?? "—")}</td><td>${escapeHtml(row.substitute_appearances ?? "—")}</td><td>${note}</td><td>${escapeHtml(row.goals ?? "—")}</td><td>${escapeHtml(row.assists ?? "—")}</td><td>${taux(row.goals)}</td><td>${taux(row.assists)}</td></tr>`;
        }).join("");
    };
    document.getElementById("performances-kind").addEventListener("change", update);
    document.getElementById("performances-minutes").addEventListener("input", update);
    update();
}
