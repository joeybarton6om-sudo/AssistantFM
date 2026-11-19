(function (global) {
    "use strict";

    const LIGNES = ["attaque", "milieu", "defense", "gardien"];

    const POIDS_LIGNE = { attaque: 1, milieu: 1.1, defense: 1, gardien: 0.55 };

    const SEANCES = [
        {
            id: "style_passes",
            nom: "Style de passes",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Rythme et verticalité des passes dans le dispositif.",
            tactique: ["passes", "direct"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "construction",
            nom: "Construction",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Contourner le pressing adverse depuis sa propre moitié.",
            tactique: ["possession", "construction"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "creation_occasions",
            nom: "Création d’occasions",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Créer des occasions avec le degré d’urgence voulu.",
            tactique: ["attaque", "creation"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "organisation_ballon",
            nom: "Organisation avec le ballon",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Postes et rôles tenus avec le ballon.",
            tactique: ["possession"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "hauteur_pressing",
            nom: "Hauteur du pressing",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Moment et zone du duel défensif.",
            tactique: ["pressing"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "intensite_pressing",
            nom: "Intensité du pressing",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Intensité et style du pressing collectif.",
            tactique: ["pressing"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "piege_pressing",
            nom: "Piège du pressing",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Zones de déclenchement du piège collectif.",
            tactique: ["pressing"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "positionnement_sans_ballon",
            nom: "Positionnement sans le ballon",
            onglet: "Compréhension tactique",
            type: "tactique",
            description: "Postes et rôles tenus sans le ballon.",
            tactique: ["defense"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "eviter_pressing",
            nom: "Éviter le pressing",
            onglet: "Préparation de match",
            type: "match",
            description: "Organisation collective derrière le ballon pour le prochain match.",
            tactique: ["possession", "construction"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["preparation"]
        },
        {
            id: "progression_ballon",
            nom: "Progression avec le ballon",
            onglet: "Préparation de match",
            type: "match",
            description: "Prise de décision avec le ballon avant le prochain match.",
            tactique: ["possession", "attaque"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["preparation"]
        },
        {
            id: "trente_derniers",
            nom: "30 derniers mètres",
            onglet: "Préparation de match",
            type: "match",
            description: "Anticipation des déplacements devant le ballon.",
            tactique: ["attaque", "creation"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["preparation"]
        },
        {
            id: "bloc_defensif",
            nom: "Bloc défensif",
            onglet: "Préparation de match",
            type: "match",
            description: "Concentration collective sur le bloc sans le ballon.",
            tactique: ["defense", "pressing"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["preparation"]
        },
        {
            id: "placement_defensif",
            nom: "Placement défensif",
            onglet: "Préparation de match",
            type: "match",
            description: "Placement individuel sans le ballon.",
            tactique: ["defense"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 1,
            blocs: ["preparation"]
        },
        {
            id: "engagement_defensif",
            nom: "Engagement défensif",
            onglet: "Préparation de match",
            type: "match",
            description: "Manière d’intervenir sur l’adversaire sans le ballon.",
            tactique: ["pressing", "defense"],
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 2,
            blocs: ["preparation"]
        },
        {
            id: "corners",
            nom: "Corners",
            onglet: "Préparation de match",
            type: "match",
            description: "Organisation offensive et défensive sur corners.",
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 1,
            blocs: ["preparation"]
        },
        {
            id: "coups_francs",
            nom: "Coups francs",
            onglet: "Préparation de match",
            type: "match",
            description: "Organisation offensive et défensive sur coups francs.",
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 0 },
            charge: 1,
            blocs: ["preparation"]
        },
        {
            id: "penalties",
            nom: "Penalties",
            onglet: "Préparation de match",
            type: "match",
            description: "Atténuer la pression des penaltys avant le prochain match.",
            impacts: { forme: 0, condition: 0, fatigue: 0, risque: 0, moral: 1 },
            charge: 0,
            blocs: ["preparation"]
        },
        {
            id: "developpement_individuel",
            nom: "Développement individuel",
            onglet: "Développement footballistique",
            type: "developpement",
            description: "Fenêtre de travail individuel dans le calendrier.",
            lignes: { attaque: [], milieu: [], defense: [], gardien: [] },
            impacts: { forme: 0, condition: -1, fatigue: 1, risque: 1, moral: 1 },
            charge: 1,
            blocs: ["developpement"]
        },
        {
            id: "travail_offensif",
            nom: "Travail offensif avec ballon",
            onglet: "Développement footballistique",
            type: "developpement",
            description: "Aptitudes générales liées à la possession, vers l’avant.",
            lignes: {
                attaque: ["dribbling", "finishing", "heading", "long_shots", "technique", "aggression", "anticipation", "composure", "decisions", "flair", "off_the_ball", "teamwork"],
                milieu: ["finishing", "long_shots", "anticipation", "flair", "off_the_ball", "dribbling", "composure"],
                defense: ["finishing", "long_shots", "anticipation", "flair", "off_the_ball"],
                gardien: ["technique", "decisions", "flair", "vision"]
            },
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 1 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "travail_defensif",
            nom: "Travail défensif avec ballon",
            onglet: "Développement footballistique",
            type: "developpement",
            description: "Aptitudes défensives de placement et de duel.",
            lignes: {
                attaque: ["marking", "tackling", "bravery", "concentration", "positioning"],
                milieu: ["marking", "tackling", "aggression", "bravery", "concentration", "positioning"],
                defense: ["heading", "marking", "tackling", "technique", "aggression", "bravery", "concentration", "decisions", "positioning", "teamwork"],
                gardien: ["anticipation", "bravery", "composure", "concentration", "positioning"]
            },
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 1 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "travail_possession",
            nom: "Travail de possession",
            onglet: "Développement footballistique",
            type: "developpement",
            description: "Aptitudes techniques liées à la conservation.",
            lignes: {
                attaque: ["first_touch", "crossing", "passing", "vision"],
                milieu: ["crossing", "dribbling", "first_touch", "heading", "passing", "technique", "composure", "decisions", "vision", "teamwork"],
                defense: ["first_touch", "crossing", "passing", "vision", "dribbling"],
                gardien: ["first_touch", "passing", "vision", "teamwork"]
            },
            impacts: { forme: 1, condition: -1, fatigue: 1, risque: 1, moral: 1 },
            charge: 2,
            blocs: ["developpement"]
        },
        {
            id: "repos",
            nom: "Repos",
            onglet: "Physique et récupération",
            type: "recuperation",
            description: "Aucune séance : repos complet du groupe.",
            lignes: { attaque: [], milieu: [], defense: [], gardien: [] },
            impacts: { forme: -1, condition: 2, fatigue: -2, risque: -2, moral: 1 },
            charge: 0,
            blocs: ["recuperation"]
        },
        {
            id: "recuperation",
            nom: "Récupération physique",
            onglet: "Physique et récupération",
            type: "recuperation",
            description: "Récupération encadrée par le staff médical.",
            lignes: { attaque: [], milieu: [], defense: [], gardien: [] },
            impacts: { forme: -1, condition: 1, fatigue: -2, risque: -2, moral: 1 },
            charge: 0,
            blocs: ["recuperation"]
        },
        {
            id: "condition_legere",
            nom: "Condition physique légère",
            onglet: "Physique et récupération",
            type: "physique",
            description: "Travail aérobie léger pour retarder la fatigue.",
            lignes: { attaque: [], milieu: [], defense: [], gardien: [] },
            impacts: { forme: -1, condition: -1, fatigue: 1, risque: 1, moral: -1 },
            charge: 1,
            blocs: ["developpement", "physique"]
        },
        {
            id: "condition",
            nom: "Condition physique",
            onglet: "Physique et récupération",
            type: "physique",
            description: "Entretien des capacités aérobies et anaérobies.",
            lignes: {
                attaque: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"],
                milieu: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"],
                defense: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"],
                gardien: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"]
            },
            impacts: { forme: -1, condition: -1, fatigue: 2, risque: 2, moral: -1 },
            charge: 3,
            blocs: ["developpement", "physique"]
        },
        {
            id: "condition_intensive",
            nom: "Condition physique intensive",
            onglet: "Physique et récupération",
            type: "physique",
            description: "Fondation physique de long terme, en préparation.",
            lignes: {
                attaque: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"],
                milieu: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"],
                defense: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"],
                gardien: ["acceleration", "agility", "balance", "jumping_reach", "pace", "stamina", "strength", "work_rate"]
            },
            impacts: { forme: -2, condition: -2, fatigue: 2, risque: 2, moral: -2 },
            charge: 4,
            blocs: ["physique"]
        },
        {
            id: "esprit_equipe",
            nom: "Esprit d’équipe",
            onglet: "Autres activités",
            type: "autre",
            description: "Renforcer les rapports hors du terrain.",
            lignes: { attaque: [], milieu: [], defense: [], gardien: [] },
            impacts: { forme: -1, condition: 1, fatigue: 0, risque: 0, moral: 2 },
            charge: 0,
            blocs: ["developpement", "recuperation"]
        },
        {
            id: "programme_proximite",
            nom: "Programme de proximité",
            onglet: "Autres activités",
            type: "autre",
            description: "Actions caritatives dans la communauté locale.",
            lignes: { attaque: [], milieu: [], defense: [], gardien: [] },
            impacts: { forme: -1, condition: 1, fatigue: 0, risque: 0, moral: 2 },
            charge: 0,
            blocs: ["developpement"]
        }
    ];

    const SEANCES_PAR_ID = new Map(SEANCES.map(seance => [seance.id, seance]));

    const CODES_FM27 = {
        0: "style_passes",
        1: "construction",
        2: "creation_occasions",
        3: "organisation_ballon",
        4: "hauteur_pressing",
        5: "intensite_pressing",
        6: "piege_pressing",
        7: "positionnement_sans_ballon",
        100: "eviter_pressing",
        101: "progression_ballon",
        102: "trente_derniers",
        103: "bloc_defensif",
        104: "placement_defensif",
        105: "engagement_defensif",
        106: "corners",
        107: "coups_francs",
        108: "penalites",
        200: "developpement_individuel",
        201: "travail_offensif",
        202: "travail_defensif",
        203: "travail_possession",
        300: "repos",
        301: "recuperation",
        302: "condition_legere",
        303: "condition",
        304: "condition_intensive",
        400: "esprit_equipe",
        401: "programme_proximite",
        500: "match"
    };

    const IDS_FM27 = new Map(Object.entries(CODES_FM27).map(([code, id]) => [id, Number(code)]));

    function codeFm27(id) {
        const code = IDS_FM27.get(id);
        return code == null ? 300 : code;
    }

    function grilleFm27(cycle) {
        const jours = cycle && cycle.jours ? cycle.jours : [];
        const debut = convertirDate(cycle && cycle.debut);
        const parDate = new Map(jours.map(jour => [String(jour.date).slice(0, 10), jour]));
        return [0, 1, 2, 3, 4, 5, 6].map(rang => {
            const jour = debut
                ? parDate.get(formaterDate(ajouterJours(debut, rang)))
                : jours[rang];
            return [0, 1, 2].map(place => {
                const seance = jour && jour.seances ? jour.seances[place] : null;
                return seance ? codeFm27(seance.id) : 300;
            });
        });
    }

    const PHASES = {
        pre_saison: {
            nom: "Pré-saison",
            description: "Pas de match proche : construire le socle physique et tactique.",
            budget: 22,
            blocs: ["physique", "developpement"]
        },
        debut_saison: {
            nom: "Début de saison",
            description: "Montée en puissance : physique puis automatismes.",
            budget: 18,
            blocs: ["physique", "developpement", "preparation"]
        },
        pleine_saison: {
            nom: "Pleine saison",
            description: "Alternance développement / préparation de match.",
            budget: 15,
            blocs: ["developpement", "preparation", "recuperation"]
        },
        fin_saison: {
            nom: "Fin de saison",
            description: "Fraîcheur physique préservée, priorité à la récupération.",
            budget: 12,
            blocs: ["developpement", "preparation", "recuperation"]
        },
        coupure: {
            nom: "Coupure",
            description: "Longue période sans match : recharge et travail spécifique.",
            budget: 16,
            blocs: ["developpement", "recuperation"]
        }
    };

    const BLOCS_LIBRES = ["recuperation"];

    function attributs(joueur) {
        return joueur && joueur.stats && typeof joueur.stats === "object" ? joueur.stats : {};
    }

    function nombre(valeur) {
        const v = Number(valeur);
        return Number.isFinite(v) ? v : null;
    }

    function joueursDuClub(joueurs) {
        const liste = Array.isArray(joueurs) ? joueurs : [];
        const duClub = liste.filter(joueur => joueur && joueur.est_mon_club === true);
        return duClub.length ? duClub : liste;
    }

    const POSTES_DEFENSE = ["dc", "dlc", "drc", "dl", "dr", "wb", "wl", "wr", "ld", "rd"];
    const POSTES_MILIEU = ["dm", "mc", "ml", "mr", "amc", "am", "mdc", "mcd", "mcg", "mcd"];
    const POSTES_ATTAQUE = ["st", "stc", "fl", "fr", "bat"];

    function ligneDuJoueur(joueur) {
        const code = codePoste(joueur);
        if (!code) return "milieu";
        if (code === "gk") return "gardien";
        if (POSTES_DEFENSE.includes(code)) return "defense";
        if (POSTES_MILIEU.includes(code)) return "milieu";
        if (POSTES_ATTAQUE.includes(code)) return "attaque";
        return "attaque";
    }

    function codePoste(joueur) {
        const brut = String(joueur && joueur.poste ? joueur.poste : "");
        return brut.split(/[,\/]/)[0].trim().toLowerCase();
    }

    function joueursParLigne(joueurs) {
        const parLigne = { attaque: [], milieu: [], defense: [], gardien: [] };
        for (const joueur of joueursDuClub(joueurs)) {
            parLigne[ligneDuJoueur(joueur)].push(joueur);
        }
        return parLigne;
    }

    function besoinsEffectif(joueurs, options) {
        const reglages = options || {};
        const limite = reglages.limite == null ? 18 : reglages.limite;
        const liste = joueursDuClub(joueurs)
            .map(joueur => ({ joueur, ca: nombre(joueur.ca) || 0 }))
            .sort((a, b) => b.ca - a.ca)
            .slice(0, limite)
            .map(entree => entree.joueur);
        const valeurs = {};
        for (const joueur of liste) {
            for (const [cle, valeur] of Object.entries(attributs(joueur))) {
                const v = nombre(valeur);
                if (v == null) continue;
                (valeurs[cle] = valeurs[cle] || []).push(v);
            }
        }
        const besoins = {};
        const moyennes = {};
        for (const [cle, liste2] of Object.entries(valeurs)) {
            if (liste2.length < 2) continue;
            const moyenne = liste2.reduce((somme, v) => somme + v, 0) / liste2.length;
            const reference = [...liste2].sort((a, b) => b - a).slice(0, Math.max(3, Math.ceil(liste2.length / 4)));
            const haut = reference.reduce((somme, v) => somme + v, 0) / reference.length;
            moyennes[cle] = moyenne;
            besoins[cle] = Math.max(0, Math.min(1, (haut - moyenne) / 12));
        }
        const maximum = Object.values(besoins).reduce((max, valeur) => Math.max(max, valeur), 0);
        const normalises = {};
        for (const [cle, valeur] of Object.entries(besoins)) {
            normalises[cle] = maximum > 0 ? valeur / maximum : 0;
        }
        return { besoins, normalises, moyennes, profils: liste.length };
    }

    function profilTactique(tactique) {
        const texte = [tactique && tactique.style, tactique && tactique.nom, tactique && tactique.description]
            .filter(Boolean).join(" ").toLocaleLowerCase("fr");
        const tags = new Set();
        const table = [
            ["possession", ["possession", "controle", "construction", "propre", "patience"]],
            ["pressing", ["pressing", "press", "agressif", "haut", "intensite", "contre-pressing"]],
            ["direct", ["direct", "vertical", "rapide", "contre", "transition"]],
            ["attaque", ["attaque", "offensif", "occasion", "but"]],
            ["defense", ["defensif", "bloc", "bas", "prudent", "conservateur"]],
            ["creation", ["creation", "technique", "inspiration"]]
        ];
        for (const [tag, mots] of table) {
            if (mots.some(mot => texte.includes(mot))) tags.add(tag);
        }
        const roles = tactique && tactique.postes ? tactique.postes : [];
        for (const poste of roles) {
            const role = String(poste.role || poste.role_nom || "").toLocaleLowerCase("fr");
            if (role.includes("libero") || role.includes("regista")) tags.add("creation");
            if (role.includes("sentinelle") || role.includes("milieu défensif")) tags.add("pressing");
            if (role.includes("ailier") || role.includes("avant")) tags.add("attaque");
        }
        return tags;
    }

    function correspondanceTactique(seance, tags) {
        if (!seance.tactique || seance.tactique.length === 0) return 0;
        const communs = seance.tactique.filter(tag => tags.has(tag)).length;
        return communs / seance.tactique.length;
    }

    function attributsCibles(seance, ligne) {
        const parLigne = seance.lignes || {};
        return parLigne[ligne] || [];
    }

    function scoreSeance(seance, contexte) {
        const besoins = contexte.besoins || {};
        let somme = 0;
        let poids = 0;
        for (const ligne of LIGNES) {
            const cibles = attributsCibles(seance, ligne);
            if (cibles.length === 0) continue;
            const p = POIDS_LIGNE[ligne] * cibles.length;
            for (const cle of cibles) somme += (besoins[cle] || 0) * POIDS_LIGNE[ligne];
            poids += p;
        }
        const gain = poids > 0 ? somme / poids : 0;
        const tactique = correspondanceTactique(seance, contexte.tags || new Set());
        const bloc = contexte.bloc || "developpement";
        const passages = contexte.utilisations ? (contexte.utilisations.get(seance.id) || 0) : 0;
        const penalite = Math.min(0.45, passages * 0.12);
        const bonusPhase = contexte.phaseBonus && contexte.phaseBonus[seance.id] ? contexte.phaseBonus[seance.id] : 0;
        if (bloc === "recuperation") return 0.3 + tactique * 0.1 + bonusPhase - penalite;
        if (bloc === "preparation") return 0.35 + tactique * 0.45 + bonusPhase - penalite;
        if (bloc === "physique") return Math.max(0.2, gain * 1.2) + tactique * 0.05 + bonusPhase - penalite;
        return Math.max(0.25, gain * 1.1) + tactique * 0.12 + bonusPhase - penalite;
    }

    function seancesAutorisees(bloc) {
        return SEANCES.filter(seance => seance.blocs.indexOf(bloc) !== -1);
    }

    function choisirSeances(bloc, contexte, nombre, exclus) {
        const autorisees = seancesAutorisees(bloc)
            .filter(seance => !exclus || !exclus.has(seance.id));
        const contexteBloc = Object.assign({}, contexte, { bloc });
        const classees = autorisees
            .map(seance => ({ seance, score: scoreSeance(seance, contexteBloc) }))
            .sort((a, b) => b.score - a.score);
        return classees.slice(0, nombre).map(entree => entree.seance);
    }

    function ajouterJours(date, jours) {
        const copie = new Date(date.getTime());
        copie.setDate(copie.getDate() + jours);
        return copie;
    }

    function convertirDate(valeur) {
        if (valeur instanceof Date) return new Date(valeur.getTime());
        const texte = String(valeur || "").slice(0, 10);
        const morceaux = texte.split("-").map(Number);
        if (morceaux.length !== 3 || morceaux.some(item => !Number.isFinite(item))) return null;
        return new Date(morceaux[0], morceaux[1] - 1, morceaux[2]);
    }

    function formaterDate(date) {
        if (!(date instanceof Date)) return "";
        const mois = String(date.getMonth() + 1).padStart(2, "0");
        const jour = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${mois}-${jour}`;
    }

    function joursEntre(de, vers) {
        const a = convertirDate(de);
        const b = convertirDate(vers);
        if (!a || !b) return 0;
        return Math.round((b.getTime() - a.getTime()) / 86400000);
    }

    function debutSemaine(date) {
        const copie = convertirDate(date);
        if (!copie) return null;
        const jour = copie.getDay();
        const ecart = jour === 1 ? 0 : jour === 0 ? -6 : 1 - jour;
        return ajouterJours(copie, ecart);
    }

    function phaseSaison(dateDebut, calendrier) {
        const date = convertirDate(dateDebut);
        const matchs = (calendrier || []).map(match => ({ match, date: convertirDate(match.date) }))
            .filter(entree => entree.date && entree.date >= date)
            .sort((a, b) => a.date - b.date);
        if (matchs.length === 0) {
            return { id: "coupure", phase: PHASES.coupure, prochain: null, ecart: null };
        }
        const ecart = joursEntre(date, matchs[0].date);
        const mois = date.getMonth();
        let id = "pleine_saison";
        if (ecart >= 14) id = mois >= 5 && mois <= 7 ? "pre_saison" : "coupure";
        else if (mois === 7 || mois === 8) id = "debut_saison";
        else if (mois === 3 || mois === 4) id = "fin_saison";
        const phase = PHASES[id] || PHASES.pleine_saison;
        return { id, phase, prochain: matchs[0], ecart };
    }

    function estJourRecuperation(avantMatch, depuisMatch, longueurCycle, phase) {
        if (avantMatch <= 1) return true;
        return false;
    }

    function blocDuJour(avantMatch, longueurCycle, phase, depuisMatch) {
        if (estJourRecuperation(avantMatch, depuisMatch, longueurCycle, phase)) return "recuperation";
        if (avantMatch === 2 || avantMatch === 3) return "preparation";
        const debutLong = longueurCycle - 3;
        if (avantMatch > debutLong && phase && (phase.id === "pre_saison" || phase.id === "coupure")) return "physique";
        return "developpement";
    }

    function seanceDepuisId(id) {
        return SEANCES_PAR_ID.get(id) || null;
    }

    function construireJour(date, avantMatch, longueurCycle, contexte, depuisMatch) {
        const bloc = blocDuJour(avantMatch, longueurCycle, contexte.phase, depuisMatch);
        const recuperation = estJourRecuperation(avantMatch, depuisMatch, longueurCycle, contexte.phase);
        const exclus = new Set();
        const seances = [];
        const surcharge = contexte.surcharge === true;
        const nombre = recuperation ? 2 : surcharge ? 2 : 3;
        if (recuperation) {
            const seance = seanceDepuisId(contexte.recuperationId || "recuperation");
            if (seance) seances.push(seance);
            exclus.add(seance.id);
            const developpement = seanceDepuisId("developpement_individuel");
            if (developpement && !exclus.has(developpement.id)) {
                seances.push(developpement);
                exclus.add(developpement.id);
            }
        }
        if (!recuperation && (avantMatch === 2 || avantMatch === 3)) {
            const penalties = seanceDepuisId("penalties");
            if (penalties && avantMatch === 2 && !exclus.has(penalties.id)) {
                seances.push(penalties);
                exclus.add(penalties.id);
            }
        }
        const complement = choisirSeances(bloc, contexte, Math.max(0, nombre - seances.length), exclus);
        for (const seance of complement) {
            seances.push(seance);
            exclus.add(seance.id);
        }
        const charge = seances.reduce((somme, seance) => somme + (seance.charge || 0), 0);
        return {
            date: formaterDate(date),
            avantMatch,
            bloc,
            seances: seances.map(seance => ({
                id: seance.id,
                nom: seance.nom,
                onglet: seance.onglet,
                type: seance.type,
                description: seance.description,
                charge: seance.charge || 0
            })),
            charge
        };
    }

    function genererCycle(debutCycle, dateMatch, contexte, options) {
        const reglages = options || {};
        const dateDebut = convertirDate(debutCycle);
        const dateFin = convertirDate(dateMatch);
        if (!dateDebut || !dateFin || dateFin < dateDebut) return null;
        const longueur = joursEntre(dateDebut, dateFin) + 1;
        const jours = [];
        const utilisations = contexte.utilisations || new Map();
        let chargeCumul = 0;
        const limite = contexte.phase && contexte.phase.budget ? contexte.phase.budget : 15;
        const depuisBase = reglages.depuisMatch == null ? null : Number(reglages.depuisMatch);
        let semaineCompteur = 0;
        let prochaineSpeciale = "esprit_equipe";
        for (let i = 0; i < longueur; i += 1) {
            const date = ajouterJours(dateDebut, i);
            const avantMatch = longueur - i - 1;
            if (avantMatch === 0) break;
            const depuisMatch = depuisBase == null || !Number.isFinite(depuisBase) ? null : depuisBase + i;
            const surcharge = chargeCumul + 6 > limite;
            const contexteJour = Object.assign({}, contexte, {
                surcharge,
                utilisations,
                phaseBonus: avantMatch >= 4 && contexte.phase && contexte.phase.id === "pre_saison"
                    ? { condition_intensive: 0.4, condition: 0.25 }
                    : {}
            });
            const recuperation = estJourRecuperation(avantMatch, depuisMatch, longueur, contexte.phase);
            const jourSemaine = date.getDay();
            if (jourSemaine === 0 && i > 0) semaineCompteur += 1;
            const estSemaineSpeciale = semaineCompteur > 0 && semaineCompteur % 3 === 0;
            const jour = construireJour(date, avantMatch, longueur, contexteJour, depuisMatch);
            for (const seance of jour.seances) {
                utilisations.set(seance.id, (utilisations.get(seance.id) || 0) + 1);
            }
            chargeCumul += jour.charge;
            if (jour.charge === 0 && avantMatch > 1 && jour.bloc !== "recuperation") {
                const esprit = seanceDepuisId("esprit_equipe");
                if (esprit) {
                    jour.seances = [esprit].map(seance => ({
                        id: seance.id,
                        nom: seance.nom,
                        onglet: seance.onglet,
                        type: seance.type,
                        description: seance.description,
                        charge: 0
                    }));
                    jour.bloc = "developpement";
                }
            }
            if (estSemaineSpeciale && !recuperation && avantMatch > 1) {
                const specialeId = prochaineSpeciale;
                prochaineSpeciale = prochaineSpeciale === "esprit_equipe" ? "programme_proximite" : "esprit_equipe";
                const seanceSpeciale = seanceDepuisId(specialeId);
                if (seanceSpeciale) {
                    const idxDev = jour.seances.findIndex(s => s.type === "developpement");
                    if (idxDev !== -1) {
                        jour.seances[idxDev] = {
                            id: seanceSpeciale.id,
                            nom: seanceSpeciale.nom,
                            onglet: seanceSpeciale.onglet,
                            type: seanceSpeciale.type,
                            description: seanceSpeciale.description,
                            charge: seanceSpeciale.charge || 0
                        };
                    } else if (jour.seances.length < 3) {
                        jour.seances.push({
                            id: seanceSpeciale.id,
                            nom: seanceSpeciale.nom,
                            onglet: seanceSpeciale.onglet,
                            type: seanceSpeciale.type,
                            description: seanceSpeciale.description,
                            charge: seanceSpeciale.charge || 0
                        });
                    }
                    jour.bloc = "developpement";
                    jour.charge = jour.seances.reduce((s, se) => s + (se.charge || 0), 0);
                }
            }
            jours.push(jour);
        }
        return { debut: formaterDate(dateDebut), match: formaterDate(dateFin), longueur, jours };
    }

    function genererProgramme(options) {
        const reglages = options || {};
        const dateDebut = convertirDate(reglages.dateDebut || reglages.date);
        if (!dateDebut) return null;
        const horizon = ajouterJours(dateDebut, reglages.nbJours == null ? 56 : reglages.nbJours);
        const joueurs = joueursDuClub(reglages.joueurs);
        const calendrierComplet = (reglages.calendrier || [])
            .map(match => ({ match, date: convertirDate(match.date) }))
            .filter(entree => entree.date)
            .sort((a, b) => a.date - b.date);
        const calendrier = calendrierComplet
            .filter(entree => entree.date >= dateDebut && entree.date <= horizon);
        const contexteSaison = phaseSaison(dateDebut, reglages.calendrier);
        const besoins = besoinsEffectif(joueurs, reglages.besoins);
        const tags = profilTactique(reglages.tactique);
        const parLigne = joueursParLigne(joueurs);
        const utilisations = new Map();
        const cycles = [];
        let curseur = dateDebut;
        for (const entree of calendrier) {
            if (entree.date < curseur) continue;
            if (entree.date.getTime() === curseur.getTime()) {
                curseur = ajouterJours(entree.date, 1);
                continue;
            }
            cycles.push({ debut: curseur, match: entree.date });
            curseur = ajouterJours(entree.date, 1);
        }
        if (cycles.length === 0) {
            const fin = ajouterJours(dateDebut, 7);
            cycles.push({ debut: dateDebut, match: fin });
        }
        const programme = [];
        let matchPrecedent = null;
        for (const entree of calendrierComplet) {
            if (entree.date <= dateDebut) matchPrecedent = entree;
            else break;
        }
        for (const cycle of cycles) {
            const depuisMatch = matchPrecedent ? joursEntre(matchPrecedent.date, cycle.debut) : null;
            const contexte = {
                besoins: besoins.normalises,
                besoinsBruts: besoins.besoins,
                moyennes: besoins.moyennes,
                tags,
                phase: contexteSaison.phase,
                effectif: parLigne,
                utilisations,
                recuperationId: "recuperation"
            };
            const rendu = genererCycle(cycle.debut, cycle.match, contexte, { depuisMatch });
            if (rendu) programme.push(rendu);
            matchPrecedent = { date: cycle.match };
        }
        return {
            dateDebut: formaterDate(dateDebut),
            dateFin: formaterDate(horizon),
            phase: { id: contexteSaison.id, nom: contexteSaison.phase.nom, description: contexteSaison.phase.description },
            besoins: besoins.besoins,
            moyennes: besoins.moyennes,
            profils: besoins.profils,
            tactique: tags.size ? [...tags] : [],
            cycles: programme,
            metriques: metriquesProgramme(programme, besoins)
        };
    }

    function metriquesProgramme(cycles, besoins) {
        let jours = 0;
        let charge = 0;
        let recuperation = 0;
        const usages = {};
        for (const cycle of cycles) {
            for (const jour of cycle.jours) {
                jours += 1;
                charge += jour.charge;
                if (jour.seances.some(seance => seance.type === "recuperation")) recuperation += 1;
                for (const seance of jour.seances) usages[seance.id] = (usages[seance.id] || 0) + 1;
            }
        }
        const entrainables = new Set();
        for (const seance of SEANCES) {
            for (const ligne of LIGNES) {
                for (const cle of attributsCibles(seance, ligne)) entrainables.add(cle);
            }
        }
        const couverts = Object.entries(besoins.normalises || {})
            .filter(([cle, valeur]) => entrainables.has(cle) && valeur >= 0.6).length;
        return {
            jours,
            chargeMoyenne: jours ? Math.round((charge / jours) * 10) / 10 : 0,
            joursRecuperation: recuperation,
            seancesUtilisees: Object.keys(usages).length,
            besoinsForts: couverts
        };
    }

    function jourLibre(date, avantMatch) {
        return {
            date: formaterDate(date),
            avantMatch: avantMatch == null ? null : avantMatch,
            bloc: "repos",
            seances: [],
            charge: 0
        };
    }

    function resumeSemaines(programme, calendrier) {
        const semaines = [];
        const index = new Map();
        for (const cycle of programme.cycles) {
            for (const jour of cycle.jours) {
                const date = convertirDate(jour.date);
                const debut = debutSemaine(date);
                const cle = formaterDate(debut);
                if (!index.has(cle)) {
                    const entree = { debut: cle, jours: [] };
                    index.set(cle, entree);
                    semaines.push(entree);
                }
                index.get(cle).jours.push(jour);
            }
        }
        const datesMatchs = (calendrier || [])
            .map(match => String(match.date).slice(0, 10))
            .sort();
        for (const entree of semaines) {
            const parDate = new Map(entree.jours.map(jour => [jour.date, jour]));
            const debut = convertirDate(entree.debut);
            const complet = [];
            for (let rang = 0; rang < 7; rang += 1) {
                const date = ajouterJours(debut, rang);
                const cle = formaterDate(date);
                if (parDate.has(cle)) {
                    complet.push(parDate.get(cle));
                    continue;
                }
                const prochain = datesMatchs.find(valeur => valeur >= cle);
                const ecart = prochain ? joursEntre(cle, prochain) : null;
                complet.push(jourLibre(date, ecart));
            }
            entree.jours = complet;
        }
        return semaines;
    }

    function csvProgramme(programme, options) {
        const reglages = options || {};
        const echapper = valeur => `"${String(valeur == null ? "" : valeur).replace(/"/g, "\"\"")}"`;
        const lignes = [["Date", "Jour", "Avant-match", "Bloc", "Séance 1", "Séance 2", "Séance 3", "Charge"].map(echapper).join(";")];
        for (const cycle of programme.cycles) {
            for (const jour of cycle.jours) {
                const date = convertirDate(jour.date);
                const libelle = date ? date.toLocaleDateString("fr-FR", { weekday: "long" }) : "";
                const seances = [0, 1, 2].map(i => (jour.seances[i] ? jour.seances[i].nom : ""));
                while (seances.length < 3) seances.push("");
                lignes.push([
                    jour.date,
                    libelle,
                    jour.avantMatch,
                    jour.bloc,
                    seances[0],
                    seances[1],
                    seances[2],
                    jour.charge
                ].map(echapper).join(";"));
            }
        }
        return lignes.join("\r\n");
    }

    function texteSaisie(programme, options) {
        const reglages = options || {};
        const jours = [];
        for (const cycle of programme.cycles) {
            for (const jour of cycle.jours) {
                if (reglages.debut && jour.date < reglages.debut) continue;
                if (reglages.fin && jour.date > reglages.fin) continue;
                jours.push(jour);
            }
        }
        return jours.map(jour => {
            const date = convertirDate(jour.date);
            const libelle = date
                ? date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                : jour.date;
            const seances = [0, 1, 2]
                .map(place => (jour.seances[place] ? `${place + 1}. ${jour.seances[place].nom}` : `${place + 1}. —`))
                .join("\n");
            return `${libelle} (J-${jour.avantMatch})\n${seances}`;
        }).join("\n\n");
    }

    global.AssistantFMEntrainementCollectif = {
        SEANCES,
        SEANCES_PAR_ID,
        CODES_FM27,
        codeFm27,
        grilleFm27,
        PHASES,
        LIGNES,
        besoinsEffectif,
        profilTactique,
        scoreSeance,
        phaseSaison,
        genererCycle,
        genererProgramme,
        resumeSemaines,
        csvProgramme,
        texteSaisie,
        convertirDate,
        formaterDate,
        joursEntre,
        debutSemaine
    };
})(typeof window !== "undefined" ? window : globalThis);