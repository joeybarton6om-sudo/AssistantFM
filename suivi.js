/*
 * Charger après app.js, puis monterPanneauSuivi(conteneur) et insérer
 * creerBoutonSuiviJoueur(joueur) dans la fiche. Après afficherDonnees(),
 * appeler actualiserPanneauSuivi() et recréer le bouton de la fiche.
 * Les méthodes de données de AssistantFMSuivi lèvent les erreurs de stockage.
 */
(function () {
    "use strict";

    const prefixe = "assistantfm-suivi-v1:";
    let panneau = null;
    let cleAffichee = null;
    let selection = new Set();
    let posteChoisi = "dc";
    let roleChoisi = "";
    let referenceChoisie = "";
    const brouillons = new Map();
    const statuts = ["a_suivre", "a_contacter", "negociation", "signe"];
    const libellesStatuts = {
        a_suivre: "À suivre", a_contacter: "À contacter",
        negociation: "En négociation", signe: "Signé"
    };
    const trisSuivi = ["ajout", "nom", "age", "ca", "pa", "valeur", "note"];
    let triSuivi = "ajout";
    let filtreStatutSuivi = "";
    let filtreTagSuivi = "";

    function brouillonsClub() {
        const cle = cleClub();
        if (!brouillons.has(cle)) brouillons.set(cle, new Map());
        return brouillons.get(cle);
    }

    function identifiant(value) {
        if (typeof value !== "string" && typeof value !== "number") return null;
        const texte = String(value).trim();
        return /^\d+$/.test(texte) ? texte : null;
    }

    function cleClub() {
        const club = rawData.club_gere;
        const uid = identifiant(club && club.uid);
        if (uid === null) throw new Error("Club géré sans identifiant : suivi indisponible pour éviter de mélanger les clubs.");
        return clePourPartie(prefixe + uid);
    }

    function nomNormalise(value) {
        return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
    }

    function reference(joueur) {
        const uid = identifiant(joueur && joueur.uid);
        const uniqueId = identifiant(joueur && joueur.unique_id);
        const nom = String(joueur && joueur.nom || "").trim();
        if ((!uid && !uniqueId) || !nom) throw new Error("Joueur sans identifiant ou nom fiable : ajout impossible.");
        return { uid, uniqueId, nom, nation: identifiant(joueur.nation_uid) };
    }

    function normaliserCible(cible) {
        const tags = Array.isArray(cible.tags)
            ? cible.tags.filter(tag => typeof tag === "string" && tag.trim()).map(tag => tag.trim().slice(0, 20)).slice(0, 5)
            : [];
        return {
            id: cible.id,
            ref: cible.ref,
            note: typeof cible.note === "string" ? cible.note : "",
            tags,
            statut: statuts.includes(cible.statut) ? cible.statut : "a_suivre",
            ajoute_le: typeof cible.ajoute_le === "string" ? cible.ajoute_le : ""
        };
    }

    function lire() {
        const cle = cleClub();
        let texte;
        try {
            texte = localStorage.getItem(cle);
        } catch (error) {
            throw new Error("Lecture du stockage local impossible : " + error.message);
        }
        if (texte === null) return [];
        let donnees;
        try {
            donnees = JSON.parse(texte);
        } catch (error) {
            throw new Error("Liste de suivi locale illisible : " + error.message);
        }
        if (!donnees || donnees.version !== 1 || !Array.isArray(donnees.cibles)
            || donnees.cibles.some(cible => !cible || typeof cible.id !== "string"
                || !cible.ref || typeof cible.ref.nom !== "string"
                || (cible.note !== undefined && typeof cible.note !== "string")
                || (cible.tags !== undefined && !Array.isArray(cible.tags))
                || (!identifiant(cible.ref.uid) && !identifiant(cible.ref.uniqueId)))
            || new Set(donnees.cibles.map(cible => cible.id)).size !== donnees.cibles.length) {
            throw new Error("Liste de suivi locale invalide ; aucune donnée n’a été écrasée.");
        }
        return donnees.cibles.map(normaliserCible);
    }

    function ecrire(cibles) {
        const cle = cleClub();
        try {
            localStorage.setItem(cle, JSON.stringify({ version: 1, cibles: cibles.map(normaliserCible) }));
        } catch (error) {
            throw new Error("Enregistrement du suivi impossible : " + error.message);
        }
    }

    function resoudre(ref, joueurs) {
        const nom = nomNormalise(ref.nom);
        const uniqueId = identifiant(ref.uniqueId);
        const uid = identifiant(ref.uid);
        const nation = identifiant(ref.nation);
        const candidats = joueurs.filter(joueur => {
            if (nomNormalise(joueur.nom) !== nom) return false;
            const nationJoueur = identifiant(joueur.nation_uid);
            if (nation && nationJoueur && nation !== nationJoueur) return false;
            const uniqueJoueur = identifiant(joueur.unique_id);
            if (uniqueId && uniqueJoueur) return uniqueId === uniqueJoueur;
            return !!uid && uid === identifiant(joueur.uid);
        });
        return candidats.length === 1 ? candidats[0] : null;
    }

    function liste() {
        const joueurs = Array.isArray(rawData.joueurs) ? rawData.joueurs : [];
        return lire().map(cible => ({ ...cible, joueur: resoudre(cible.ref, joueurs) }));
    }

    function nouvelId(cibles) {
        let id;
        do {
            id = (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
                ? globalThis.crypto.randomUUID()
                : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
        } while (cibles.some(cible => cible.id === id));
        return id;
    }

    function ajouter(joueur) {
        const ref = reference(joueur);
        const cibles = lire();
        const joueurs = Array.isArray(rawData.joueurs) ? rawData.joueurs : [];
        const retrouve = resoudre(ref, joueurs);
        if (!retrouve || retrouve !== joueur) throw new Error("Joueur absent ou ambigu dans l’extraction actuelle.");
        if (cibles.some(cible => resoudre(cible.ref, joueurs) === joueur)) return false;
        cibles.push({ id: nouvelId(cibles), ref, note: "", tags: [], statut: "a_suivre", ajoute_le: new Date().toISOString() });
        ecrire(cibles);
        return true;
    }

    function supprimer(id) {
        const cibles = lire();
        const restantes = cibles.filter(cible => cible.id !== id);
        if (restantes.length === cibles.length) throw new Error("Cible introuvable ; actualisez le panneau.");
        ecrire(restantes);
        brouillonsClub().delete(id);
        selection.delete(id);
    }

    function cibleParId(id) {
        const cibles = lire();
        const cible = cibles.find(item => item.id === id);
        if (!cible) throw new Error("Cible introuvable ; actualisez le panneau.");
        return { cibles, cible };
    }

    function modifier(id, modifieur) {
        const { cibles, cible } = cibleParId(id);
        modifieur(cible);
        ecrire(cibles);
        return cible;
    }

    function enregistrerNote(id, note) {
        modifier(id, cible => { cible.note = String(note); });
    }

    function enregistrerStatut(id, statut) {
        if (!statuts.includes(statut)) throw new Error("Statut de suivi inconnu.");
        modifier(id, cible => { cible.statut = statut; });
    }

    function normaliserTags(bruts) {
        const liste = Array.isArray(bruts) ? bruts : String(bruts || "").split(",");
        const propres = [];
        liste.forEach(brut => {
            const tag = String(brut).trim().slice(0, 20);
            if (tag && !propres.includes(tag) && propres.length < 5) propres.push(tag);
        });
        return propres;
    }

    function enregistrerTags(id, tags) {
        const propres = normaliserTags(tags);
        modifier(id, cible => { cible.tags = propres; });
        return propres;
    }

    function cellule(value) {
        return escapeHtml(value == null || value === "" ? "—" : value);
    }

    function comparaison(cibles) {
        if (cibles.length < 2) return '<p class="profile-disclaimer">Sélectionnez 2 à 4 joueurs disponibles pour comparer.</p>';
        const options = rolesParPoste[posteChoisi] || [];
        if (!options.includes(roleChoisi)) roleChoisi = options[0] || "";
        const role = roles[roleChoisi];
        const joueurs = cibles.map(cible => cible.joueur);
        if (!cibles.some(cible => cible.id === referenceChoisie)) referenceChoisie = cibles[0].id;
        const indexReference = cibles.findIndex(cible => cible.id === referenceChoisie);
        const ligne = (label, valeurs) => `<tr><th scope="row">${escapeHtml(label)}</th>${valeurs.map(value => `<td>${cellule(value)}</td>`).join("")}</tr>`;
        const ligneEcart = (label, valeurs) => `<tr><th scope="row">${escapeHtml(label)}</th>${valeurs.map((value, index) => {
            if (!estNombre(value)) return "<td>—</td>";
            const delta = estNombre(valeurs[indexReference]) ? Number(value) - Number(valeurs[indexReference]) : null;
            const classe = delta > 0 ? "comparison-better" : delta < 0 ? "comparison-worse" : "";
            const suffixe = index === indexReference ? " · référence" : delta === null ? "" : ` (${delta > 0 ? "+" : ""}${Number(delta.toFixed(2))})`;
            return `<td class="${classe}">${escapeHtml(value)}${escapeHtml(suffixe)}</td>`;
        }).join("")}</tr>`;
        const money = value => value == null || value === "" ? "—" : formatMoney(value);
        const postesDisponibles = Object.keys(rolesParPoste)
            .filter(id => postes[id] && (rolesParPoste[id] || []).length);
        if (!postesDisponibles.includes(posteChoisi)) posteChoisi = postesDisponibles[0] || "dc";
        const optionsPoste = postesDisponibles
            .map(id => `<option value="${escapeHtml(id)}"${id === posteChoisi ? " selected" : ""}>${escapeHtml(postes[id])}</option>`).join("");
        const optionsRole = options.map(id =>
            `<option value="${escapeHtml(id)}"${id === roleChoisi ? " selected" : ""}>${escapeHtml(roles[id].nom)}</option>`).join("");
        const attributs = role ? role.stats : [];
        const lignesAttributs = attributs.map(key =>
            ligneEcart(nomsStats[key] || key, joueurs.map(joueur => {
                const valeur = (joueur.stats || {})[key];
                return estNombre(valeur) ? Number(valeur) : "—";
            }))).join("");
        const radar = typeof Comparateur !== "undefined"
            ? Comparateur.radar(joueurs, role, posteChoisi)
            : "";
        return `<section class="profile-section"><h3>Comparaison côte à côte</h3>
            <div class="profile-controls"><label>Poste<select data-suivi-poste>${optionsPoste}</select></label>
            <label>Rôle<select data-suivi-role>${optionsRole || '<option value="">Aucun rôle disponible</option>'}</select></label>
            <label>Référence<select data-suivi-reference>${cibles.map(cible => `<option value="${escapeHtml(cible.id)}"${cible.id === referenceChoisie ? " selected" : ""}>${escapeHtml(cible.joueur.nom)}</option>`).join("")}</select></label></div>
            <p class="profile-disclaimer">Les écarts indiqués entre parenthèses sont relatifs à la référence. Score de rôle indicatif sur les attributs disponibles ; les données manquantes ne sont pas assimilées à zéro.</p>
            ${radar}
            <div class="scroll"><table><thead><tr><th scope="col">Critère</th>${joueurs.map(joueur => `<th scope="col">${cellule(joueur.nom)}</th>`).join("")}</tr></thead><tbody>
            ${ligne("Club", joueurs.map(j => j.club))}
            ${ligne("Âge", joueurs.map(j => j.age))}
            ${ligne("CA", joueurs.map(j => j.ca))}
            ${ligne("PA", joueurs.map(j => j.pa))}
            ${ligne("Valeur marchande", joueurs.map(j => money(j.valeur_marchande)))}
            ${ligne("Coût estimé", joueurs.map(j => money(coutEstime(j))))}
            ${ligne("Fin du contrat", joueurs.map(j => j.fin_contrat))}
            ${ligne("Salaire hebdomadaire", joueurs.map(j => money(j.salaire_hebdomadaire)))}
            ${ligne("Statut", joueurs.map(j => traduireStatutEffectif(j.statut_effectif || (j.sous_contrat === false ? "sans_contrat" : ""))))}
            ${ligne("Statut de suivi", cibles.map(cible => libellesStatuts[cible.statut]))}
            ${ligne("Tags", cibles.map(cible => cible.tags.length ? cible.tags.join(", ") : "—"))}
            ${ligneEcart("Maîtrise du poste", joueurs.map(j => estNombre(j.positions?.[posteChoisi]) ? Number(j.positions[posteChoisi]) : null))}
            ${ligneEcart("Score de rôle", joueurs.map(j => { const valeur = role ? noteRole(j, role, posteChoisi) : null; return Number.isFinite(valeur) ? Number(valeur.toFixed(2)) : null; }))}
            ${lignesAttributs}</tbody></table></div>
            <div class="profile-controls"><button type="button" class="tab-btn" data-suivi-export>Exporter la comparaison (CSV)</button><span data-suivi-export-status role="status"></span></div></section>`;
    }

    function valeurTriee(cible, joueur, tri = triSuivi) {
        switch (tri) {
            case "nom": return String(joueur ? joueur.nom : cible.ref.nom).toLocaleLowerCase("fr");
            case "age": return estNombre(joueur?.age) ? Number(joueur.age) : -1;
            case "ca": return estNombre(joueur?.ca) ? Number(joueur.ca) : -1;
            case "pa": return estNombre(joueur?.pa) ? Number(joueur.pa) : -1;
            case "valeur": return estNombre(joueur?.valeur_marchande) ? Number(joueur.valeur_marchande) : -1;
            case "note": return estNombre(cible.note) ? Number(cible.note) : -1;
            default: return cible.ajoute_le || "";
        }
    }

    function trierCibles(cibles, tri = triSuivi) {
        const copies = [...cibles];
        copies.sort((a, b) => {
            const joueurA = a.joueur, joueurB = b.joueur;
            const gauche = valeurTriee(a, joueurA, tri), droite = valeurTriee(b, joueurB, tri);
            if (typeof gauche === "string" || typeof droite === "string") {
                return String(gauche).localeCompare(String(droite), "fr") || String(a.ref.nom).localeCompare(String(b.ref.nom), "fr");
            }
            return gauche - droite || String(a.ref.nom).localeCompare(String(b.ref.nom), "fr");
        });
        return copies;
    }

    function filtrerCibles(cibles, statut = filtreStatutSuivi, tag = filtreTagSuivi) {
        return cibles.filter(cible => {
            if (statut && cible.statut !== statut) return false;
            if (tag && !cible.tags.includes(tag)) return false;
            return true;
        });
    }

    function optionsTri() {
        return [
            ["ajout", "Ajout récent"], ["nom", "Nom"], ["age", "Âge"],
            ["ca", "CA"], ["pa", "PA"], ["valeur", "Valeur"], ["note", "Note"]
        ].map(([valeur, label]) =>
            `<option value="${valeur}"${valeur === triSuivi ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
    }

    function optionsStatut(id, courant) {
        return statuts.map(valeur =>
            `<option value="${valeur}"${valeur === courant ? " selected" : ""}>${escapeHtml(libellesStatuts[valeur])}</option>`).join("");
    }

    function optionsTag(cible) {
        const tous = new Set();
        liste().forEach(item => item.tags.forEach(tag => tous.add(tag)));
        const valeur = filtreTagSuivi || "";
        return `<option value=""${valeur ? "" : " selected"}>Tous les tags</option>` +
            [...tous].sort((a, b) => a.localeCompare(b, "fr")).map(tag =>
                `<option value="${escapeHtml(tag)}"${tag === valeur ? " selected" : ""}>${escapeHtml(tag)}</option>`).join("");
    }

    function csvSuivi(cibles) {
        const lignes = [["Nom", "Club", "Poste", "Âge", "CA", "PA", "Valeur marchande", "Coût estimé", "Fin du contrat", "Statut", "Tags", "Note"]];
        cibles.forEach(cible => {
            const joueur = cible.joueur || {};
            const celluleCsv = value => {
                const texte = String(value ?? "");
                return /[";\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
            };
            lignes.push([
                cible.ref.nom, joueur.club, joueur.nom ? afficherPoste(joueur) : "",
                joueur.age, joueur.ca, joueur.pa, joueur.valeur_marchande, coutEstime(joueur),
                joueur.fin_contrat, libellesStatuts[cible.statut], cible.tags.join(", "), cible.note
            ].map(celluleCsv));
        });
        return lignes.map(ligne => ligne.join(";")).join("\r\n");
    }

    function afficher(message = "", erreur = false) {
        if (!panneau) return;
        try {
            const cle = cleClub();
            if (cle !== cleAffichee) {
                selection = new Set();
                cleAffichee = cle;
            }
            const cibles = liste();
            const notesNonEnregistrees = brouillonsClub();
            const disponibles = new Set(cibles.filter(cible => cible.joueur).map(cible => cible.id));
            selection = new Set([...selection].filter(id => disponibles.has(id)));
            const filtres = filtrerCibles(cibles);
            const ordonnees = trierCibles(filtres);
            const cartes = ordonnees.map(cible => {
                const joueur = cible.joueur;
                const id = escapeHtml(cible.id);
                const tags = cible.tags.map(tag => `<span class="suivi-tag">${escapeHtml(tag)}</span>`).join("");
                return `<section class="profile-section">
                    <h3>${cellule(joueur ? joueur.nom : cible.ref.nom)}</h3>
                    <p class="profile-disclaimer">${joueur ? cellule(joueur.club) : "Absent ou identité ambiguë dans l’extraction actuelle ; aucune correspondance automatique."}</p>
                    ${joueur ? `<p class="profile-disclaimer">${escapeHtml(joueur.age != null ? joueur.age + " ans" : "Âge inconnu")} · CA ${escapeHtml(joueur.ca ?? "—")} · PA ${escapeHtml(joueur.pa ?? "—")}${joueur.valeur_marchande != null ? " · " + escapeHtml(formatMoney(joueur.valeur_marchande)) : ""}</p>` : ""}
                    <label class="checkbox-container"><input type="checkbox" data-suivi-selection="${id}"${selection.has(cible.id) ? " checked" : ""}${!joueur ? " disabled" : ""}> Comparer</label>
                    <label>Statut de suivi<select data-suivi-statut="${id}">${optionsStatut(id, cible.statut)}</select></label>
                    <label>Tags (5 max, 20 caractères)<input type="text" data-suivi-tags="${id}" value="${escapeHtml(cible.tags.join(", "))}" placeholder="ex. prioritaire, prêt"></label>
                    ${tags ? `<p class="suivi-tags">${tags}</p>` : ""}
                    <label>Note personnelle<textarea data-suivi-note="${id}" rows="3" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:8px">${escapeHtml(notesNonEnregistrees.has(cible.id) ? notesNonEnregistrees.get(cible.id) : cible.note)}</textarea></label>
                    <button type="button" class="tab-btn" data-suivi-supprimer="${id}">Retirer du suivi</button>
                </section>`;
            }).join("");
            const choisis = cibles.filter(cible => selection.has(cible.id) && cible.joueur);
            const avertissement = notesNonEnregistrees.size
                ? "Des notes n’ont pas été enregistrées : vérifiez le stockage, puis modifiez à nouveau les notes concernées."
                : "";
            panneau.innerHTML = `<section><h2>Liste de suivi</h2><p data-suivi-message role="${erreur || avertissement ? "alert" : "status"}" class="profile-disclaimer">${escapeHtml([message, avertissement].filter(Boolean).join(" "))}</p>
                <p class="profile-disclaimer">Enregistrée uniquement dans ce navigateur pour le club géré. Les joueurs absents ou ambigus restent dans la liste.</p>
                <div class="profile-controls"><label>Trier<select data-suivi-tri>${optionsTri()}</select></label>
                <label>Filtrer par statut<select data-suivi-filtre-statut><option value="">Tous les statuts</option>${statuts.filter(valeur => valeur !== filtreStatutSuivi).map(valeur => `<option value="${valeur}">${escapeHtml(libellesStatuts[valeur])}</option>`).join("")}</select></label>
                <label>Filtrer par tag<select data-suivi-filtre-tag>${optionsTag()}</select></label></div>
                <button type="button" class="tab-btn" data-suivi-plan>Simuler des arrivées et départs</button>
                <button type="button" class="tab-btn" data-suivi-mercato>Préparer le mercato</button>
                <button type="button" class="tab-btn" data-suivi-export${filtres.length ? "" : " disabled"}>Exporter la liste (CSV)</button>
                <p class="profile-disclaimer">${filtres.length} cible(s) affichée(s) sur ${cibles.length}.</p>
                <div class="profile-layout">${cartes || '<p class="profile-disclaimer">Aucune cible suivie ne correspond aux filtres.</p>'}</div>
                ${comparaison(choisis)}</section>`;
            if (erreur) panneau.querySelector("[data-suivi-message]").setAttribute("role", "alert");
        } catch (error) {
            cleAffichee = null;
            selection.clear();
            panneau.innerHTML = `<section class="profile-section"><h2>Liste de suivi</h2><p role="alert">${escapeHtml(error.message)}</p></section>`;
        }
    }

    function erreurPanneau(error) {
        const message = panneau && panneau.querySelector("[data-suivi-message]");
        if (message) {
            message.textContent = error.message;
            message.setAttribute("role", "alert");
        } else {
            afficher(error.message, true);
        }
    }

    function verifierClubAffiche() {
        if (cleClub() !== cleAffichee) {
            afficher("Le club a changé ; panneau actualisé.");
            return false;
        }
        return true;
    }

    function clic(event) {
        const raccourci = event.target.closest("[data-suivi-plan], [data-suivi-mercato], [data-suivi-export]");
        if (raccourci && panneau.contains(raccourci)) {
            try {
                if (!verifierClubAffiche()) return;
                if (raccourci.hasAttribute("data-suivi-export")) {
                    const cibles = trierCibles(filtrerCibles(liste()));
                    if (!cibles.length) throw new Error("Aucune cible à exporter.");
                    const exporte = typeof Comparateur !== "undefined"
                        ? Comparateur.telechargerCsv(`suivi-${cleClub().replace(/^assistantfm-suivi-v1:/, "").slice(0, 40)}.csv`, csvSuivi(cibles))
                        : false;
                    const status = panneau.querySelector("[data-suivi-export-status]");
                    if (status) status.textContent = exporte ? "Export CSV généré." : "Export CSV ouvert dans un nouvel onglet.";
                } else {
                    changerOnglet(raccourci.hasAttribute("data-suivi-plan") ? "planificateur" : "mercato");
                }
            } catch (error) { erreurPanneau(error); }
            return;
        }
        const bouton = event.target.closest("[data-suivi-supprimer]");
        if (!bouton || !panneau.contains(bouton)) return;
        try {
            if (!verifierClubAffiche()) return;
            supprimer(bouton.getAttribute("data-suivi-supprimer"));
            afficher("Cible retirée du suivi.");
        } catch (error) {
            erreurPanneau(error);
        }
    }

    function changement(event) {
        const element = event.target;
        try {
            if (!verifierClubAffiche()) return;
            if (element.hasAttribute("data-suivi-note")) {
                const id = element.getAttribute("data-suivi-note");
                const notesNonEnregistrees = brouillonsClub();
                notesNonEnregistrees.set(id, element.value);
                enregistrerNote(id, element.value);
                notesNonEnregistrees.delete(id);
                const message = panneau.querySelector("[data-suivi-message]");
                message.textContent = notesNonEnregistrees.size
                    ? "Note enregistrée ; d’autres notes restent non enregistrées."
                    : "Note enregistrée.";
                message.setAttribute("role", notesNonEnregistrees.size ? "alert" : "status");
            } else if (element.hasAttribute("data-suivi-statut")) {
                const id = element.getAttribute("data-suivi-statut");
                enregistrerStatut(id, element.value);
                afficher("Statut de suivi mis à jour.");
            } else if (element.hasAttribute("data-suivi-tags")) {
                const id = element.getAttribute("data-suivi-tags");
                enregistrerTags(id, element.value);
                afficher("Tags enregistrés.");
            } else if (element.hasAttribute("data-suivi-tri")) {
                triSuivi = element.value;
                afficher();
            } else if (element.hasAttribute("data-suivi-filtre-statut")) {
                filtreStatutSuivi = element.value;
                afficher();
            } else if (element.hasAttribute("data-suivi-filtre-tag")) {
                filtreTagSuivi = element.value;
                afficher();
            } else if (element.hasAttribute("data-suivi-selection")) {
                const id = element.getAttribute("data-suivi-selection");
                if (element.checked && selection.size >= 4) {
                    element.checked = false;
                    throw new Error("Vous pouvez comparer au maximum 4 joueurs.");
                }
                if (element.checked) selection.add(id); else selection.delete(id);
                afficher();
            } else if (element.hasAttribute("data-suivi-poste")) {
                posteChoisi = element.value;
                roleChoisi = "";
                afficher();
            } else if (element.hasAttribute("data-suivi-role")) {
                roleChoisi = element.value;
                afficher();
            } else if (element.hasAttribute("data-suivi-reference")) {
                referenceChoisie = element.value;
                afficher();
            }
        } catch (error) {
            erreurPanneau(error);
        }
    }

    function monterPanneauSuivi(conteneur) {
        if (!conteneur || typeof conteneur.addEventListener !== "function") throw new Error("Conteneur de suivi invalide.");
        if (panneau) {
            panneau.removeEventListener("click", clic);
            panneau.removeEventListener("change", changement);
        }
        panneau = conteneur;
        cleAffichee = null;
        selection.clear();
        panneau.addEventListener("click", clic);
        panneau.addEventListener("change", changement);
        afficher();
    }

    function actualiserPanneauSuivi() {
        afficher();
    }

    function comparerJoueurs(joueur, referenceJoueur, poste, role) {
        if (!joueur || !referenceJoueur || joueur === referenceJoueur) throw new Error("Deux joueurs distincts sont nécessaires pour comparer.");
        const cibles = lire();
        const joueurs = Array.isArray(rawData.joueurs) ? rawData.joueurs : [];
        const references = [joueur, referenceJoueur].map(person => {
            const ref = reference(person);
            if (resoudre(ref, joueurs) !== person) throw new Error("Joueur absent ou ambigu dans l’extraction actuelle.");
            return ref;
        });
        const ids = [joueur, referenceJoueur].map((person, index) => {
            let cible = cibles.find(item => resoudre(item.ref, joueurs) === person);
            if (!cible) {
                cible = { id: nouvelId(cibles), ref: references[index], note: "" };
                cibles.push(cible);
            }
            return cible.id;
        });
        ecrire(cibles);
        const conteneur = document.getElementById("suivi-view");
        if (panneau !== conteneur) monterPanneauSuivi(conteneur);
        cleAffichee = cleClub();
        selection = new Set([ids[1], ids[0]]);
        referenceChoisie = ids[1];
        posteChoisi = poste;
        roleChoisi = role;
        changerOnglet("suivi");
    }

    function creerBoutonSuiviJoueur(joueur) {
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "tab-btn";
        function rafraichir() {
            try {
                const cible = liste().find(item => item.joueur === joueur);
                bouton.textContent = cible ? "Retirer du suivi" : "Ajouter au suivi";
                bouton.title = "";
                bouton.setAttribute("aria-pressed", cible ? "true" : "false");
                return cible;
            } catch (error) {
                bouton.textContent = "Suivi indisponible : " + error.message;
                bouton.title = error.message;
                bouton.setAttribute("aria-pressed", "false");
                return null;
            }
        }
        bouton.addEventListener("click", () => {
            try {
                const cible = liste().find(item => item.joueur === joueur);
                if (cible) supprimer(cible.id); else ajouter(joueur);
                rafraichir();
                afficher(cible ? "Cible retirée du suivi." : "Cible ajoutée au suivi.");
            } catch (error) {
                bouton.textContent = "Erreur de suivi : " + error.message;
                bouton.title = error.message;
                erreurPanneau(error);
            }
        });
        rafraichir();
        return bouton;
    }

    window.AssistantFMSuivi = {
        liste, ajouter, supprimer, enregistrerNote, enregistrerStatut, enregistrerTags,
        comparerJoueurs, csv: csvSuivi, trier: trierCibles, filtrer: filtrerCibles,
        monterPanneauSuivi, actualiserPanneauSuivi, creerBoutonSuiviJoueur, statuts: statuts
    };
    window.monterPanneauSuivi = monterPanneauSuivi;
    window.actualiserPanneauSuivi = actualiserPanneauSuivi;
    window.creerBoutonSuiviJoueur = creerBoutonSuiviJoueur;
    window.afficherSuivi = function () {
        const conteneur = document.getElementById("suivi-view");
        if (panneau !== conteneur) monterPanneauSuivi(conteneur);
        else actualiserPanneauSuivi();
    };
}());
