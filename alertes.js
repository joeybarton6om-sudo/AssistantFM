function cleAlertes() {
    const club = rawData.club_gere;
    if (!club || !club.name || (club.unique_id == null && club.uid == null)) {
        throw new Error("Club géré non identifié : suivi local et alertes indisponibles.");
    }
    return clePourPartie(`assistantfm-alertes-v1-${club.unique_id ?? club.uid}-${club.name}`);
}

function lireAlertes() {
    const texte = localStorage.getItem(cleAlertes());
    if (!texte) return { filtres: [], capture: null, derniereAlerte: null, regles: [] };
    const data = JSON.parse(texte);
    if (!data || !Array.isArray(data.filtres) || !("capture" in data)) {
        throw new Error("Données locales d’alertes invalides ; elles n’ont pas été écrasées.");
    }
    if (!Array.isArray(data.regles)) data.regles = [];
    data.regles = data.regles.filter(regle => regle && ["contrat", "valeur", "ca", "pa"].includes(regle.type)
        && ["suivi", "tous", "club"].includes(regle.portee) && Number.isFinite(Number(regle.seuil)) && Number(regle.seuil) > 0)
        .map((regle, index) => ({ ...regle, id: regle.id || `regle-${index}`, seuil: Number(regle.seuil) }));
    return data;
}

function indexIdentitesAlertes() {
    const counts = new Map();
    rawData.joueurs.forEach(player => {
        if (player.unique_id != null) {
            const id = String(player.unique_id);
            counts.set(id, (counts.get(id) || 0) + 1);
        }
    });
    const result = new Map();
    rawData.joueurs.forEach(player => {
        const id = player.unique_id != null && counts.get(String(player.unique_id)) === 1
            ? `id:${player.unique_id}` : player.uid != null && player.nom
                ? `uid:${player.uid}:${player.nom}` : "";
        if (!id) return;
        if (result.has(id)) result.set(id, null);
        else result.set(id, player);
    });
    for (const [id, player] of result) if (!player) result.delete(id);
    return result;
}

function captureFiltreJoueur() {
    const ids = ["age-min", "age-max", "ca-min", "ca-max", "pa-min", "pa-max",
        "valeur-min", "valeur-max", "poste-filter", "pied-filter", "contrat-filter"];
    const valeurs = Object.fromEntries(ids.map(id => [id, document.getElementById(id).value]));
    for (const id of ids) {
        if (!document.getElementById(id).checkValidity()) throw new Error("Un filtre contient une valeur invalide.");
    }
    for (const prefix of ["age", "ca", "pa", "valeur"]) {
        const min = valeurs[`${prefix}-min`], max = valeurs[`${prefix}-max`];
        if (min !== "" && max !== "" && Number(min) > Number(max)) throw new Error(`Bornes ${prefix} incohérentes.`);
    }
    const attributs = lireFiltresAttributs();
    if (attributs.erreur) throw new Error(attributs.erreur);
    const coutMax = document.getElementById("cout-max");
    const salaireMin = document.getElementById("salaire-min"), salaireMax = document.getElementById("salaire-max");
    if ([coutMax, salaireMin, salaireMax].some(control => !control.checkValidity()
        || (control.value !== "" && !Number.isSafeInteger(Number(control.value))))) {
        throw new Error("Limite de coût ou salaire invalide.");
    }
    if (salaireMin.value !== "" && salaireMax.value !== "" && Number(salaireMin.value) > Number(salaireMax.value)) {
        throw new Error("Les bornes de salaire sont incohérentes.");
    }
    return { valeurs, margeReputation: document.getElementById("marge-reputation").value,
        coutMax: coutMax.value, salaireMin: salaireMin.value, salaireMax: salaireMax.value, multipleOffre: String(multipleOffreDefaut),
        attributs: attributs.criteres, recherche: document.getElementById("se").value.trim(),
        monClub: document.getElementById("chk-mon-club").checked,
        ueOnly: document.getElementById("ue-only").checked };
}

function correspondFiltreEnregistre(player, filtre) {
    const valeurs = filtre.valeurs;
    const bornes = (value, prefix) => {
        const min = valeurs[`${prefix}-min`], max = valeurs[`${prefix}-max`];
        return (!min && !max) || (estNombre(value) && (!min || Number(value) >= Number(min))
            && (!max || Number(value) <= Number(max)));
    };
    if (!bornes(player.age, "age") || !bornes(player.ca, "ca") || !bornes(player.pa, "pa")
        || !bornes(player.valeur_marchande, "valeur")) return false;
    if (valeurs["poste-filter"] && !joueurAuPoste(player, valeurs["poste-filter"])) return false;
    if (valeurs["pied-filter"] && player.pied_fort !== valeurs["pied-filter"]) return false;
    if (filtre.ueOnly === true && !personneUE(player)) return false;
    if (valeurs["contrat-filter"] === "yes" && player.sous_contrat !== true) return false;
    if (valeurs["contrat-filter"] === "no" && player.sous_contrat !== false) return false;
    if (filtre.monClub && player.est_mon_club !== true) return false;
    if (filtre.margeReputation != null && player.est_mon_club !== true
        && estNombre(rawData.club_gere?.reputation) && estNombre(player.reputation)
        && Number(player.reputation) > Number(rawData.club_gere.reputation) + Number(filtre.margeReputation)) return false;
    if ((filtre.salaireMin || filtre.salaireMax) && (!estNombre(player.salaire_hebdomadaire)
        || (filtre.salaireMin && Number(player.salaire_hebdomadaire) < Number(filtre.salaireMin))
        || (filtre.salaireMax && Number(player.salaire_hebdomadaire) > Number(filtre.salaireMax)))) return false;
    if (filtre.coutMax) {
        const cout = coutEstime(player, filtre.multipleOffre);
        if (!estNombre(cout) || Number(cout) > Number(filtre.coutMax)) return false;
    }
    if (filtre.recherche) {
        const recherche = filtre.recherche.toLocaleLowerCase("fr");
        const trouve = [player.nom, afficherPoste(player), player.club]
            .some(value => String(value ?? "").toLocaleLowerCase("fr").includes(recherche));
        if (!trouve && (filtre.margeReputation == null
            || !String(resumeRecrutement(player)?.label ?? "").toLocaleLowerCase("fr").includes(recherche))) return false;
    }
    return filtre.attributs.every(critere => {
        const value = player.stats?.[critere.key];
        return estNombre(value) && (critere.min === null || Number(value) >= critere.min)
            && (critere.max === null || Number(value) <= critere.max);
    });
}

function appliquerFiltreEnregistre(filtre) {
    Object.entries(filtre.valeurs).forEach(([id, value]) => { document.getElementById(id).value = value; });
    document.getElementById("pied-filter").value = filtre.valeurs["pied-filter"] ?? "";
    document.getElementById("ue-only").checked = filtre.ueOnly === true;
    document.getElementById("cout-max").value = filtre.coutMax ?? "";
    document.getElementById("salaire-min").value = filtre.salaireMin ?? "";
    document.getElementById("salaire-max").value = filtre.salaireMax ?? "";
    if (filtre.margeReputation != null) {
        document.getElementById("marge-reputation").value = filtre.margeReputation;
        document.getElementById("marge-reputation-valeur").textContent = `+${document.getElementById("marge-reputation").value}`;
    }
    if (modeDecouverte) ["ca-min", "ca-max", "pa-min", "pa-max"].forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("se").value = filtre.recherche;
    document.getElementById("chk-mon-club").checked = filtre.monClub;
    attributeFilterRows.replaceChildren();
    filtre.attributs.forEach(critere => {
        ajouterFiltreAttribut();
        const row = attributeFilterRows.lastElementChild;
        row.querySelector("select").value = critere.key;
        const inputs = row.querySelectorAll("input");
        inputs[0].value = critere.min ?? "";
        inputs[1].value = critere.max ?? "";
    });
    changerOnglet("joueurs");
    document.getElementById("player-filters").open = true;
    document.getElementById("saved-filter-status").textContent =
        filtre.multipleOffre != null && Number(filtre.multipleOffre) !== multipleOffreDefaut
            ? "Cette recherche utilisait un ancien multiple d’offre ; la liste utilise maintenant le multiple fixe de 1,5. L’alerte enregistrée conserve son multiple d’origine."
            : "";
}

function snapshotAlertes(index, filtres) {
    const club = {}, correspondances = {}, valeurs = {};
    for (const [id, player] of index) {
        if (player.est_mon_club === true) club[id] = { ca: player.ca, nom: player.nom };
        if (estNombre(player.valeur_marchande)) valeurs[id] = Number(player.valeur_marchande);
    }
    filtres.forEach(filtre => {
        correspondances[filtre.id] = [];
        for (const [id, player] of index) if (correspondFiltreEnregistre(player, filtre.criteres)) {
            correspondances[filtre.id].push(id);
        }
    });
    const typeIdentite = [...index.keys()].some(id => id.startsWith("id:")) ? "id-fm" : "local";
    return { date: rawData.date_sauvegarde || null, typeIdentite, club, correspondances, valeurs };
}

function porteeJoueurs(portee, index) {
    if (portee === "club") return [...index.values()].filter(player => player.est_mon_club === true);
    if (portee === "suivi") {
        try {
            return (window.AssistantFMSuivi?.liste() || []).map(item => item.joueur).filter(Boolean);
        } catch (error) {
            return [];
        }
    }
    return [...index.values()];
}

function descriptionRegle(regle) {
    const seuil = Number(regle.seuil);
    if (regle.type === "contrat") return `Contrat ≤ ${seuil} mois`;
    if (regle.type === "valeur") return `Baisse de valeur ≥ ${seuil} %`;
    if (regle.type === "ca") return `CA ≥ ${seuil}`;
    return `PA ≥ ${seuil}`;
}

function libellePortee(portee) {
    return { suivi: "Joueurs suivis", club: "Mon club", tous: "Tous les joueurs" }[portee] || portee;
}

function evaluerRegles(data, index) {
    const reference = dateJeuUtc(rawData.date_sauvegarde) || new Date();
    const base = data.derniereAlerte?.valeursAvant || null;
    const identites = new Map([...index].map(([id, player]) => [player, id]));
    return (data.regles || []).map(regle => {
        const joueurs = porteeJoueurs(regle.portee, index);
        const resultats = [];
        if (regle.type === "contrat") {
            joueurs.forEach(player => {
                const end = dateJeuUtc(String(player.fin_contrat || "").slice(0, 10));
                const days = end ? (end - reference) / 86400000 : null;
                if (days !== null && days >= 0 && days <= Number(regle.seuil) * 30.44) {
                    resultats.push({ player, days, detail: `${Math.ceil(days)} j · ${player.fin_contrat}` });
                }
            });
            resultats.sort((a, b) => a.days - b.days);
        } else if (regle.type === "valeur") {
            if (!base) return { regle, joueurs: [], needsBaseline: true };
            joueurs.forEach(player => {
                const avant = base[identites.get(player)];
                const actuel = player.valeur_marchande;
                if (!estNombre(avant) || !estNombre(actuel) || Number(avant) <= 0) return;
                const baisse = (Number(avant) - Number(actuel)) / Number(avant) * 100;
                if (baisse >= Number(regle.seuil)) {
                    resultats.push({ player, detail: `${baisse.toFixed(1)} % · ${formatMoney(avant)} → ${formatMoney(actuel)}` });
                }
            });
            resultats.sort((a, b) => parseFloat(b.detail) - parseFloat(a.detail));
        } else {
            joueurs.forEach(player => {
                const valeur = player[regle.type];
                if (estNombre(valeur) && Number(valeur) >= Number(regle.seuil)) {
                    resultats.push({ player, detail: `${regle.type.toUpperCase()} ${valeur}` });
                }
            });
            resultats.sort((a, b) => Number(b.player[regle.type] || 0) - Number(a.player[regle.type] || 0));
        }
        return { regle, joueurs: resultats };
    });
}

function monterReglesAlertes(target, data) {
    const type = target.querySelector("[data-regle-type]");
    const unite = target.querySelector("[data-regle-unite]");
    const majUnite = () => {
        unite.textContent = { contrat: "mois", valeur: "%", ca: "CA min", pa: "PA min" }[type.value] || "";
    };
    type.addEventListener("change", majUnite);
    majUnite();
    target.querySelector("[data-regle-add]").addEventListener("click", () => {
        const status = target.querySelector("[data-regle-status]");
        try {
            const seuil = Number(target.querySelector("[data-regle-seuil]").value);
            if (!Number.isFinite(seuil) || seuil <= 0) throw new Error("Saisissez un seuil numérique positif.");
            const id = `regle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            data.regles.push({ id, type: type.value, portee: target.querySelector("[data-regle-portee]").value, seuil });
            localStorage.setItem(cleAlertes(), JSON.stringify(data));
            afficherAlertes();
        } catch (error) {
            status.textContent = `Ajout impossible : ${error.message}`;
        }
    });
    target.querySelectorAll("[data-regle-delete]").forEach(button => button.addEventListener("click", () => {
        const status = target.querySelector("[data-regle-status]");
        try {
            data.regles = data.regles.filter(regle => regle.id !== button.getAttribute("data-regle-delete"));
            localStorage.setItem(cleAlertes(), JSON.stringify(data));
            afficherAlertes();
        } catch (error) {
            status.textContent = `Suppression impossible : ${error.message}`;
        }
    }));
}

function actualiserAlertesChargement() {
    const status = document.getElementById("alertes-status");
    try {
        const data = lireAlertes();
        const index = indexIdentitesAlertes();
        const current = snapshotAlertes(index, data.filtres);
        if (data.capture && data.capture.typeIdentite !== current.typeIdentite) {
            data.derniereAlerte = { avant: data.capture.date, apres: current.date, changes: [], nouveaux: [],
                avertissement: "La méthode d’identification des joueurs a changé : capture de référence renouvelée sans comparaison pour éviter de fausses alertes." };
        } else if (data.capture && JSON.stringify(data.capture) !== JSON.stringify(current)) {
            const changes = [];
            for (const [id, player] of Object.entries(current.club)) {
                const old = data.capture.club?.[id];
                if (old && estNombre(old.ca) && estNombre(player.ca) && Number(old.ca) !== Number(player.ca)) {
                    changes.push({ id, delta: Number(player.ca) - Number(old.ca) });
                }
            }
            const nouveaux = data.filtres.map(filtre => {
                const previous = new Set(data.capture.correspondances?.[filtre.id] || []);
                return { id: filtre.id, ids: current.correspondances[filtre.id].filter(id => !previous.has(id)) };
            });
            data.derniereAlerte = { avant: data.capture.date, apres: current.date, changes, nouveaux, valeursAvant: data.capture.valeurs || {} };
        }
        data.capture = current;
        localStorage.setItem(cleAlertes(), JSON.stringify(data));
        status.textContent = "";
    } catch (error) {
        status.textContent = `Alertes locales indisponibles : ${error.message}`;
    }
}

function sauvegarderFiltre() {
    const status = document.getElementById("saved-filter-status");
    try {
        if (mode !== "joueurs") throw new Error("Enregistrez le filtre depuis l’onglet Joueurs.");
        const nom = document.getElementById("saved-filter-name").value.trim();
        if (!nom) throw new Error("Donnez un nom au filtre.");
        const data = lireAlertes();
        if (data.filtres.some(filtre => filtre.nom.toLocaleLowerCase("fr") === nom.toLocaleLowerCase("fr"))) {
            throw new Error("Ce nom de filtre existe déjà.");
        }
        const criteres = captureFiltreJoueur();
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        data.filtres.push({ id, nom, criteres });
        const index = indexIdentitesAlertes();
        if (!data.capture) data.capture = snapshotAlertes(index, []);
        data.capture.correspondances[id] = [...index].filter(([, player]) => correspondFiltreEnregistre(player, criteres)).map(([key]) => key);
        localStorage.setItem(cleAlertes(), JSON.stringify(data));
        document.getElementById("saved-filter-name").value = "";
        status.textContent = `Filtre « ${nom} » enregistré. Les nouveaux profils seront signalés après un prochain chargement.`;
    } catch (error) {
        status.textContent = `Enregistrement impossible : ${error.message}`;
    }
}

function afficherAlertes() {
    const target = document.getElementById("alertes-view");
    try {
        const data = lireAlertes();
        const index = indexIdentitesAlertes();
        const reference = dateJeuUtc(rawData.date_sauvegarde);
        const contracts = [...index.values()].filter(player => {
            const end = dateJeuUtc(String(player.fin_contrat || "").slice(0, 10));
            const days = reference && end ? (end - reference) / 86400000 : null;
            return player.est_mon_club === true && days !== null && days >= 0 && days <= 183;
        }).sort((a, b) => String(a.fin_contrat).localeCompare(String(b.fin_contrat)));
        const alert = data.derniereAlerte;
        const changes = (modeDecouverte ? [] : alert?.changes || []).map(item => ({ ...item, player: index.get(item.id) }))
            .filter(item => item.player).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        const filters = data.filtres.map((filter, i) => {
            if (modeDecouverte && ["ca-min", "ca-max", "pa-min", "pa-max"].some(id => filter.criteres.valeurs[id])) {
                return `<div class="dashboard-card"><h3>${escapeHtml(filter.nom)}</h3><p>Recherche masquée car elle utilise le CA ou le PA.</p><button type="button" data-delete-filter="${i}">Supprimer</button></div>`;
            }
            const ids = alert?.nouveaux?.find(item => item.id === filter.id)?.ids || [];
            const found = ids.map(id => index.get(id)).filter(Boolean);
            return `<div class="dashboard-card"><h3>${escapeHtml(filter.nom)}</h3><button type="button" data-load-filter="${i}">Appliquer</button> <button type="button" data-delete-filter="${i}">Supprimer</button>
                <p>${ids.length} nouveau(x) profil(s) depuis le chargement précédent${found.length > 30 ? " · 30 premiers affichés" : ""}.</p>
                ${found.slice(0, 30).map(player => `<div class="dashboard-item">${linkJoueur(player)} · ${escapeHtml(afficherPoste(player))} · CA ${escapeHtml(player.ca ?? "—")}</div>`).join("")}</div>`;
        }).join("");
        const regles = evaluerRegles(data, index);
        const reglesHtml = `<div class="dashboard-card"><h3>Règles personnalisées</h3>
            <div class="profile-controls">
                <label>Type<select data-regle-type>
                    <option value="contrat">Fin de contrat</option>
                    <option value="valeur">Baisse de valeur</option>
                    <option value="ca">CA minimum</option>
                    <option value="pa">PA minimum</option>
                </select></label>
                <label>Portée<select data-regle-portee>
                    <option value="suivi">Joueurs suivis</option>
                    <option value="tous">Tous les joueurs</option>
                    <option value="club">Mon club</option>
                </select></label>
                <label>Seuil <input data-regle-seuil type="number" min="1" step="1" value="6"> <span data-regle-unite>mois</span></label>
                <button type="button" data-regle-add>Ajouter la règle</button>
            </div>
            <p data-regle-status role="status"></p>
            ${(data.regles || []).map(regle => {
                const resultat = regles.find(item => item.regle.id === regle.id);
                const joueurs = resultat?.joueurs || [];
                return `<div class="dashboard-item"><strong>${escapeHtml(descriptionRegle(regle))}</strong> · ${escapeHtml(libellePortee(regle.portee))} · ${joueurs.length} joueur(s)
                    <button type="button" data-regle-delete="${escapeHtml(regle.id)}">Supprimer</button>
                    ${resultat?.needsBaseline ? " · référence de valeur à établir" : ""}
                    ${joueurs.slice(0, 20).map(item => `<div>${linkJoueur(item.player)} · ${escapeHtml(item.detail)}</div>`).join("")}
                    ${joueurs.length > 20 ? `<div>… ${joueurs.length - 20} autres</div>` : ""}</div>`;
            }).join("") || "<p>Aucune règle pour le moment.</p>"}
        </div>`;
        target.innerHTML = `<h2>Alertes et recherches enregistrées</h2><p class="caveat">Données locales à ce navigateur, isolées par club. Les nouvelles recherches enregistrent la marge de réputation ; les recherches anciennes conservent leurs critères d’origine. Le budget des analyses ne filtre pas la liste. Les comparaisons utilisent l’identifiant FM unique quand il est non ambigu, sinon l’identifiant local et le nom ; utilisez la même partie.</p>
            <p>${alert ? `Comparaison : ${escapeHtml(alert.avant || "date inconnue")} → ${escapeHtml(alert.apres || "date inconnue")}.` : "Première capture : les changements apparaîtront au prochain chargement différent."}</p>
            ${alert?.avertissement ? `<p role="status">${escapeHtml(alert.avertissement)}</p>` : ""}
            <div class="dashboard-grid"><div class="dashboard-card"><h3>Contrats du club à 6 mois (${contracts.length})</h3>${reference ? contracts.map(player => `<div class="dashboard-item">${linkJoueur(player)} · ${escapeHtml(player.fin_contrat)}</div>`).join("") || "Aucun contrat identifié." : "Date de sauvegarde indisponible."}</div>
            <div class="dashboard-card"><h3>Variations de CA (${changes.length})</h3>${modeDecouverte ? "Masquées en mode découverte." : changes.slice(0, 30).map(item => `<div class="dashboard-item">${linkJoueur(item.player)} · ${item.delta > 0 ? "+" : ""}${item.delta}</div>`).join("") || "Aucune variation détectée."}</div>${filters}</div>
            ${reglesHtml}
            ${data.filtres.length ? "" : "<p>Pour suivre de nouvelles cibles, enregistrez un filtre dans l’onglet Joueurs.</p>"}`;
        target.querySelectorAll("[data-load-filter]").forEach(button => button.addEventListener("click", () => appliquerFiltreEnregistre(data.filtres[Number(button.dataset.loadFilter)].criteres)));
        target.querySelectorAll("[data-delete-filter]").forEach(button => button.addEventListener("click", () => {
            try {
                const removed = data.filtres.splice(Number(button.dataset.deleteFilter), 1)[0];
                if (data.capture?.correspondances) delete data.capture.correspondances[removed.id];
                localStorage.setItem(cleAlertes(), JSON.stringify(data));
                afficherAlertes();
            } catch (error) {
                target.insertAdjacentHTML("afterbegin", `<p role="alert">Suppression impossible : ${escapeHtml(error.message)}</p>`);
            }
        }));
        monterReglesAlertes(target, data);
    } catch (error) {
        target.innerHTML = `<h2>Alertes</h2><p role="alert">Impossible de lire les alertes locales : ${escapeHtml(error.message)}</p>`;
    }
}
