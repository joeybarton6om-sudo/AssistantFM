(function (global) {
    "use strict";

    const FOCUS_ENTRAINEMENT = [
        { id: "vivacite", nom: "Vivacité", categorie: "Physique", attributs: ["acceleration", "pace"] },
        { id: "agilite", nom: "Agilité et équilibre", categorie: "Physique", attributs: ["agility", "balance"] },
        { id: "resistance", nom: "Résistance", categorie: "Physique", attributs: ["strength", "jumping_reach"] },
        { id: "endurance", nom: "Endurance", categorie: "Physique", attributs: ["stamina", "natural_fitness"] },
        { id: "conversion", nom: "Conversion des occasions", categorie: "Attaque & Création", attributs: ["finishing", "composure", "heading", "technique"] },
        { id: "creation", nom: "Création d’occasions", categorie: "Attaque & Création", attributs: ["passing", "vision", "flair", "decisions", "technique"] },
        { id: "deplacements", nom: "Déplacements offensifs", categorie: "Attaque & Création", attributs: ["off_the_ball", "anticipation", "decisions"] },
        { id: "trente_derniers", nom: "Trente derniers mètres", categorie: "Attaque & Création", attributs: ["passing", "first_touch", "technique", "vision", "decisions", "composure"] },
        { id: "tirs", nom: "Tirs", categorie: "Attaque & Création", attributs: ["finishing", "long_shots", "technique", "composure"] },
        { id: "conservation", nom: "Conservation du ballon", categorie: "Possession & Technique", attributs: ["first_touch", "passing", "technique", "composure", "decisions"] },
        { id: "progression", nom: "Progression du ballon", categorie: "Possession & Technique", attributs: ["dribbling", "passing", "technique", "off_the_ball", "decisions"] },
        { id: "passes", nom: "Passes", categorie: "Possession & Technique", attributs: ["passing", "vision", "technique"] },
        { id: "centres", nom: "Centres", categorie: "Possession & Technique", attributs: ["crossing", "technique"] },
        { id: "controle", nom: "Contrôle de balle", categorie: "Possession & Technique", attributs: ["first_touch", "dribbling", "technique", "agility"] },
        { id: "pressing", nom: "Pressing", categorie: "Défense & Pressing", attributs: ["aggression", "work_rate", "stamina", "anticipation", "decisions"] },
        { id: "contenir", nom: "Contenir l’adversaire", categorie: "Défense & Pressing", attributs: ["marking", "tackling", "concentration", "positioning", "decisions"] },
        { id: "placement_defensif", nom: "Placement défensif", categorie: "Défense & Pressing", attributs: ["positioning", "anticipation", "concentration", "decisions"] },
        { id: "tacles", nom: "Tacles", categorie: "Défense & Pressing", attributs: ["tackling", "aggression", "bravery"] },
        { id: "marquage", nom: "Marquage", categorie: "Défense & Pressing", attributs: ["marking", "concentration", "positioning"] },
        { id: "jeu_aerien", nom: "Jeu aérien", categorie: "Défense & Pressing", attributs: ["heading", "jumping_reach", "strength", "bravery"] },
        { id: "coups_francs", nom: "Coups francs", categorie: "Coups de pied arrêtés", attributs: ["free_kick_taking", "technique", "long_shots", "crossing"] },
        { id: "corners", nom: "Tirer les corners", categorie: "Coups de pied arrêtés", attributs: ["corners", "crossing", "technique"] },
        { id: "penalties", nom: "Penalties", categorie: "Coups de pied arrêtés", attributs: ["penalty_taking", "composure", "finishing"] },
        { id: "touches_longues", nom: "Touches longues", categorie: "Coups de pied arrêtés", attributs: ["long_throws", "strength", "balance"] }
    ];

    const FOCUS_PAR_ID = new Map(FOCUS_ENTRAINEMENT.map(focus => [focus.id, focus]));
    const CATEGORIES = [...new Set(FOCUS_ENTRAINEMENT.map(focus => focus.categorie))];

    const NIVEAUX_INTENSITE = ["Légère", "Normale", "Intense"];
    const SEUIL_POSITION = 10;

    function attributs(joueur) {
        return joueur && joueur.stats && typeof joueur.stats === "object" ? joueur.stats : {};
    }

    function valeur(joueur, cle) {
        const brute = attributs(joueur)[cle];
        const nombre = Number(brute);
        return Number.isFinite(nombre) ? nombre : null;
    }

    function scoreFocus(joueur, focus) {
        if (!focus) return null;
        const valeurs = focus.attributs
            .map(cle => ({ cle, valeur: valeur(joueur, cle) }))
            .filter(item => item.valeur !== null);
        if (!valeurs.length) return null;
        const moyenne = valeurs.reduce((somme, item) => somme + item.valeur, 0) / valeurs.length;
        return {
            id: focus.id,
            nom: focus.nom,
            categorie: focus.categorie,
            moyenne: Math.round(moyenne * 10) / 10,
            valeurs,
            manquants: focus.attributs.filter(cle => valeur(joueur, cle) === null)
        };
    }

    function codePosition(slot, perspective) {
        const codes = (perspective === "sans" ? slot && slot.sans_ball : slot && slot.avec_ball) || [];
        const premier = Array.isArray(codes) ? codes[0] : codes;
        return String(premier || "").trim();
    }

    function roleDuSlot(slot, perspective, rolesChoisis, roles, rolesParPoste) {
        const position = codePosition(slot, perspective);
        if (!position) return null;
        const choix = rolesChoisis ? rolesChoisis[slot.numero] : null;
        const roleId = choix && roles && roles[choix] ? choix : (rolesParPoste && (rolesParPoste[position] || [])[0]);
        const role = roleId ? roles[roleId] : null;
        if (!role) return null;
        return {
            slot: slot.numero,
            position,
            roleId,
            role,
            duty: slot.duty || null
        };
    }

    function eligibilite(joueur, position) {
        const note = Number(joueur && joueur.positions ? joueur.positions[position] : NaN);
        return Number.isFinite(note) ? note : null;
    }

    function choisirRole(joueur, tactique, perspective, rolesChoisis, roles, rolesParPoste, noteRole, affectations) {
        const manuel = affectations || {};
        const postes = tactique && tactique.postes ? tactique.postes : [];
        const uid = joueur == null ? "" : String(joueur.uid);
        let meilleur = null;
        let force = null;
        postes.forEach(slot => {
            const infos = roleDuSlot(slot, perspective, rolesChoisis, roles, rolesParPoste);
            if (!infos) return;
            const note = Number(noteRole(joueur, infos.role, infos.position));
            const candidat = {
                slot: infos.slot,
                position: infos.position,
                roleId: infos.roleId,
                role: infos.role,
                duty: infos.duty,
                score: Number.isFinite(note) ? note : 0,
                eligibilite: eligibilite(joueur, infos.position),
                manuel: false
            };
            if (uid && String(manuel[slot.numero] == null ? "" : manuel[slot.numero]) === uid) {
                candidat.manuel = true;
                if (!force) force = candidat;
            }
            const position = candidat.eligibilite;
            const eligible = candidat.manuel || position === null || position >= SEUIL_POSITION;
            if (!eligible) return;
            if (!meilleur || candidat.score > meilleur.score
                || (candidat.score === meilleur.score && candidat.manuel && !meilleur.manuel)) {
                meilleur = candidat;
            }
        });
        return force || meilleur;
    }

    function priorites(joueur, rolesCibles, limite) {
        const nombre = limite == null ? 1 : limite;
        const cles = new Set();
        (rolesCibles || []).forEach(item => {
            const role = item && item.role ? item.role : item;
            (role && role.stats ? role.stats : []).forEach(cle => cles.add(cle));
        });
        if (!cles.size) return [];
        const candidats = [];
        FOCUS_ENTRAINEMENT.forEach(focus => {
            const communs = focus.attributs.filter(cle => cles.has(cle));
            if (communs.length < 2) return;
            const score = scoreFocus(joueur, focus);
            if (!score || score.valeurs.length < 2) return;
            const pertinence = communs.length / Math.min(cles.size, focus.attributs.length);
            const faiblesse = Math.max(0, 20 - score.moyenne);
            candidats.push({
                id: focus.id,
                nom: focus.nom,
                categorie: focus.categorie,
                communs,
                score: score.moyenne,
                valeurs: score.valeurs,
                pertinence: Math.round(pertinence * 100) / 100,
                valeur: Math.round(pertinence * faiblesse * 10) / 10
            });
        });
        candidats.sort((a, b) => b.valeur - a.valeur || a.score - b.score);
        return candidats.slice(0, Math.max(1, nombre));
    }

    function intensiteEntrainement(joueur) {
        const age = Number(joueur && joueur.age);
        const ca = Number(joueur && joueur.ca);
        const pa = Number(joueur && joueur.pa);
        const professionnalisme = Number(joueur && joueur.personnalite ? joueur.personnalite.professionalism : NaN);
        const fragilite = valeur(joueur, "injury_proneness");
        const blesse = Array.isArray(joueur && joueur.blessures) && joueur.blessures.length > 0;
        const marge = Number.isFinite(ca) && Number.isFinite(pa) ? pa - ca : null;
        const raisons = [];
        let niveau = "Normale";
        const jeune = Number.isFinite(age) && age <= 21;
        const vieux = Number.isFinite(age) && age >= 33;

        if (blesse) {
            niveau = "Légère";
            raisons.push("blessure en cours");
        } else if (vieux) {
            niveau = "Légère";
            raisons.push(`${age} ans`);
        } else if (jeune && (marge === null || marge >= 6)) {
            niveau = "Intense";
            raisons.push(marge === null ? `${age} ans` : `${age} ans, marge de progression +${marge}`);
        }
        if (!blesse && fragilite !== null && fragilite >= 15 && niveau !== "Légère") {
            niveau = "Légère";
            raisons.push(`fragilité ${fragilite}/20`);
        }
        if (niveau === "Normale" && Number.isFinite(professionnalisme) && professionnalisme >= 15) {
            niveau = "Intense";
            raisons.push(`professionnalisme ${professionnalisme}/20`);
        }
        if (!raisons.length) {
            raisons.push(Number.isFinite(age) ? `${age} ans` : "profil standard");
            if (marge !== null && marge > 0) raisons.push(`marge +${marge}`);
        }
        return { niveau, raisons };
    }

    function planPourJoueur(joueur, tactique, options) {
        const reglages = options || {};
        const avec = choisirRole(joueur, tactique, "avec", reglages.rolesChoisis, reglages.roles, reglages.rolesParPoste, reglages.noteRole, reglages.affectations);
        const sans = choisirRole(joueur, tactique, "sans", reglages.rolesChoisis, reglages.roles, reglages.rolesParPoste, reglages.noteRole, reglages.affectations);
        const cibles = [avec, sans].filter(Boolean).map(item => ({ role: item.role, position: item.position }));
        const focus = priorites(joueur, cibles, reglages.limitePriorites);
        return {
            joueur,
            avec,
            sans,
            priorites: focus,
            intensite: intensiteEntrainement(joueur),
            aDesRoles: Boolean(avec || sans)
        };
    }

    function planGlobal(joueurs, tactique, options) {
        const reglages = options || {};
        const plans = (joueurs || []).map(joueur => planPourJoueur(joueur, tactique, reglages));
        const avecRoles = plans.filter(item => item.aDesRoles);
        const parFocus = new Map();
        avecRoles.forEach(item => {
            item.priorites.forEach(priorite => {
                const entree = parFocus.get(priorite.id) || { id: priorite.id, nom: priorite.nom, categorie: priorite.categorie, joueurs: [] };
                entree.joueurs.push(item.joueur);
                parFocus.set(priorite.id, entree);
            });
        });
        const focusPlusUrgeants = [...parFocus.values()]
            .sort((a, b) => b.joueurs.length - a.joueurs.length)
            .slice(0, 5);
        const parNiveau = NIVEAUX_INTENSITE.map(niveau => ({
            niveau,
            joueurs: avecRoles.filter(item => item.intensite.niveau === niveau).map(item => item.joueur)
        }));
        return {
            tactique,
            plans,
            couverts: avecRoles.length,
            total: plans.length,
            focusPlusUrgeants,
            parNiveau
        };
    }

    function csvPlan(summary, options) {
        const reglages = options || {};
        const noms = reglages.nomsStats || {};
        const nomPoste = reglages.nomPoste || (position => position);
        const echapper = valeur => `"${String(valeur == null ? "" : valeur).replace(/"/g, '""')}"`;
        const entetes = ["Joueur", "Poste", "Rôle avec ballon (ALB)", "Rôle sans ballon (SLB)", "Priorité", "Intensité", "Justification"];
        const lignes = [entetes.map(echapper).join(";")];
        summary.plans.forEach(item => {
            const priorite = item.priorites || [];
            const detail = priorite.map(p => {
                const valeurs = (p.valeurs || [])
                    .map(v => `${noms[v.cle] || v.cle} ${v.valeur}`)
                    .join(", ");
                return `${p.nom} (${p.score}/20 — ${valeurs})`;
            }).join(" | ");
            lignes.push([
                item.joueur.nom,
                nomPoste(item.avec ? item.avec.position : item.sans ? item.sans.position : ""),
                item.avec ? item.avec.role.nom : "",
                item.sans ? item.sans.role.nom : "",
                priorite[0] ? priorite[0].nom : "",
                item.intensite.niveau,
                `${detail}${item.intensite.raisons.length ? ` — intensité : ${item.intensite.raisons.join(", ")}` : ""}`
            ].map(echapper).join(";"));
        });
        return lignes.join("\r\n");
    }

    global.AssistantFMEntrainement = {
        FOCUS_ENTRAINEMENT,
        FOCUS_PAR_ID,
        CATEGORIES,
        NIVEAUX_INTENSITE,
        SEUIL_POSITION,
        scoreFocus,
        roleDuSlot,
        choisirRole,
        priorites,
        intensiteEntrainement,
        planPourJoueur,
        planGlobal,
        csvPlan
    };
})(typeof window !== "undefined" ? window : globalThis);