let rawData = { joueurs: [], staff: [], tactiques: [], selections: [] };
let sourceData = null;
let modeDecouverte = false;
let mode = "joueurs", listAct = [], maxRow = 100, sortProp = "", asc = true, entSel = null, entSelMode = "joueurs";
let derniereVueRecrutement = "joueurs";
let derniereVueSuivi = "suivi";
const multipleOffreDefaut = 1.5;
let profilePosition = "", profileRole = "", profileActiveTab = "profile", profileAttributeTab = "field";
let profileComparisonPlayerIndex = null;
let competitionActiveTab = "classement";
let staffOverviewTab = "recommendations";
let clubActiveTab = "effectif", clubRosterFilter = "all", clubRosterPositionFilter = "all";
let clubRosterSort = "poste", clubRosterAscending = true;
let clubIndexByName = new Map(), clubIndexById = new Map();
let leagueNamesByTeam = new Map();
let portraitIndex = new Map(), portraitIds = new Map(), portraitsReady = false, portraitError = "";
let competitionNames = new Map();
let competitionNamesError = "";
let tacticalPitchMode = "combine";
const tacticalRoles = {};
const tacticPositionFixes = {};
const tacticJoueurAffectes = {};


function chargerPositionFixes(tacticId) {
    try {
        const raw = localStorage.getItem(`assistantfm-tactic-fixes-${tacticId}`);
        if (raw) tacticPositionFixes[tacticId] = JSON.parse(raw);
    } catch (e) {}
}

function sauvegarderPositionFixes(tacticId) {
    try {
        localStorage.setItem(`assistantfm-tactic-fixes-${tacticId}`, JSON.stringify(tacticPositionFixes[tacticId] || {}));
    } catch (e) {}
}

function chargerJoueurAffectes(tacticId) {
    try {
        const raw = localStorage.getItem(`assistantfm-tactic-joueurs-${tacticId}`);
        if (raw) tacticJoueurAffectes[tacticId] = JSON.parse(raw);
    } catch (e) {}
}

function sauvegarderJoueurAffectes(tacticId) {
    try {
        localStorage.setItem(`assistantfm-tactic-joueurs-${tacticId}`, JSON.stringify(tacticJoueurAffectes[tacticId] || {}));
    } catch (e) {}
}
// Version de l'application (doit correspondre à APP_VERSION dans assistant_desktop.py)
const APP_VERSION = "1.0.6-beta";
// URL du fichier version.json (repo releases dédié)
const UPDATE_CHECK_URL = "https://raw.githubusercontent.com/joeybarton6om-sudo/releases/main/version.json";

let dossiersConfig = { logos: "", visages: "", sauvegardes: "", tactiques: "" };

async function chargerConfigDossiers() {
    try {
        const response = await fetch("/api/dossiers");
        if (response.ok) {
            dossiersConfig = await response.json();
        }
    } catch (error) {
        console.warn("Impossible de charger la configuration des dossiers :", error);
    }
}
const vuesClub = {
    diagnostic: "diagnostic-view",
    performances: "performances-view",
    laboratoire: "laboratoire-view",
    optimisation: "optimisation-view",
    jeunes: "jeunes-view",
    confiance: "confiance-view"
};
const attributsGardien = [
    "handling", "aerial_reach", "command_of_area", "communication", "kicking",
    "throwing", "one_on_ones", "positioning", "reflexes", "rushing_out", "punching"
];
const st = document.getElementById("st");
const tbody = document.getElementById("tb");
const scr = document.querySelector(".scroll");
const modal = document.getElementById("stat-modal");
const saveInput = document.getElementById("save-fi");
const extractButton = document.getElementById("extract-button");
const sidebarToggle = document.getElementById("sidebar-toggle");

// Identifiants de base FM, distincts des identifiants locaux à chaque sauvegarde.
const codesNationsFM = {
    5: "DZ", 6: "AO", 7: "BJ", 8: "BW", 9: "BF", 10: "BI", 11: "CM", 12: "CV",
    13: "CF", 14: "TD", 15: "DJ", 16: "EG", 17: "GQ", 18: "ET", 19: "GA", 20: "GM",
    21: "GH", 22: "GN", 23: "GW", 24: "CI", 25: "KE", 26: "LS", 27: "LR", 28: "LY",
    29: "MG", 30: "MW", 31: "ML", 32: "MR", 33: "MU", 34: "MA", 35: "MZ", 36: "NA",
    37: "NE", 38: "NG", 39: "RW", 40: "ST", 41: "SN", 42: "SC", 43: "SL", 44: "SO",
    45: "ZA", 46: "SD", 47: "SZ", 48: "TZ", 49: "CG", 50: "TG", 51: "TN", 52: "UG",
    53: "CD", 54: "ZM", 55: "ZW", 106: "AF", 107: "BH", 108: "BD", 109: "BN", 110: "CN",
    111: "HK", 112: "IN", 113: "ID", 114: "IR", 115: "IQ", 116: "JP", 117: "JO", 118: "KH",
    119: "KZ", 120: "KW", 121: "KG", 122: "LA", 123: "LB", 124: "MO", 125: "MY", 126: "MV",
    127: "MM", 128: "NP", 129: "KP", 130: "OM", 131: "PK", 132: "QA", 133: "SA", 134: "SG",
    135: "KR", 136: "LK", 137: "SY", 138: "TW", 139: "TJ", 140: "TH", 141: "PH", 142: "TM",
    143: "AE", 144: "UZ", 145: "VN", 146: "YE", 359: "AG", 360: "AW", 361: "BB", 362: "BZ",
    363: "BM", 364: "CA", 365: "KY", 366: "CR", 367: "CU", 368: "DM", 370: "SV", 371: "GD",
    373: "GT", 374: "GY", 375: "HT", 376: "HN", 377: "JM", 379: "MX", 381: "NI", 382: "PA",
    383: "PR", 384: "LC", 385: "KN", 386: "VC", 387: "SR", 388: "BS", 389: "TT", 390: "US",
    752: "AL", 753: "AD", 754: "AM", 755: "AT", 756: "AZ", 757: "BE", 758: "BY", 759: "BA",
    760: "BG", 761: "HR", 762: "CY", 763: "CZ", 764: "DK", 766: "EE", 767: "FO", 768: "FI",
    769: "FR", 770: "GE", 771: "DE", 772: "GR", 773: "HU", 774: "IS", 775: "IL", 776: "IT",
    777: "LV", 778: "LI", 779: "LT", 780: "LU", 781: "MK", 782: "MT", 783: "MD", 784: "NL",
    786: "NO", 787: "PL", 788: "PT", 789: "IE", 790: "RO", 791: "RU", 792: "SM", 794: "SK",
    795: "SI", 796: "ES", 797: "SE", 798: "CH", 799: "TR", 800: "UA", 802: "RS", 1435: "AU",
    1436: "CK", 1437: "FJ", 1438: "NZ", 1439: "PG", 1440: "SB", 1442: "TO", 1443: "VU",
    1444: "WS", 1649: "AR", 1650: "BO", 1651: "BR", 1652: "CL", 1653: "CO", 1654: "EC", 1655: "PY",
    1656: "PE", 1657: "UY", 1658: "VE", 1662: "PS", 129504: "AS", 129505: "MN", 129508: "GU", 129511: "ER",
    129514: "AI", 129517: "VG", 129520: "MS", 129523: "VI", 129526: "TC", 129532: "NC", 131012: "BT", 142527: "DO",
    919586: "KM", 5626837: "TL", 8162661: "MC", 62002127: "ME"
};
const nomsNationsFM = {
    380: "Antilles néerlandaises", 765: "Angleterre", 785: "Irlande du Nord",
    793: "Écosse", 801: "Pays de Galles", 138: "Taipei chinois", 1441: "Tahiti",
    214394: "Gibraltar", 217945: "Kosovo", 917496: "Guyane française",
    917498: "Guadeloupe", 917502: "Martinique", 917506: "Sint Maarten",
    917508: "Saint-Martin", 917510: "La Réunion", 918740: "Mayotte",
    13113220: "Soudan du Sud"
};
const nomsRegions = new Intl.DisplayNames(["fr"], { type: "region" });
const codesUnionEuropeenne = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE"
]);

function nomNation(personne) {
    const nom = personne?.nation_name || personne?.country_name;
    if (nom) return nom;
    const uid = personne?.nation_uid;
    if (uid == null) return "";
    return nomsNationsFM[uid] || (codesNationsFM[uid] ? nomsRegions.of(codesNationsFM[uid]) : "") || "";
}

function nomCompetition(classement, club = {}) {
    return competitionNames.get(String(classement?.competition_uid))
        || classement?.competition_nom
        || club.division_name || club.league_name || "";
}

function clubPourPersonne(personne) {
    return (personne?.club_uid != null ? clubIndexById.get(String(personne.club_uid)) : null)
        || clubIndexByName.get(String(personne?.club || "").trim())
        || null;
}

function liguePersonne(personne) {
    const club = clubPourPersonne(personne);
    if (!club) return "";
    const key = `${club.uid ?? club.name}|${personne?.team_slot ?? ""}`;
    if (leagueNamesByTeam.has(key)) return leagueNamesByTeam.get(key);
    const league = nomCompetition(classementPersonne(personne, club), club);
    leagueNamesByTeam.set(key, league);
    return league;
}

function classementPersonne(personne, club = clubPourPersonne(personne)) {
    if (!club) return null;
    const standings = (club?.classements || [])
        .filter(item => personne?.team_slot == null || item.equipe_slot == null
            || Number(item.equipe_slot) === Number(personne.team_slot))
        .sort((a, b) => Number(b.matches_joues || 0) - Number(a.matches_joues || 0));
    return standings[0] || classementClubActuel(club);
}

function personneUE(personne) {
    const nations = Array.isArray(personne?.nations_uid) && personne.nations_uid.length
        ? personne.nations_uid
        : [personne?.nation_uid];
    return nations.some(uid => codesUnionEuropeenne.has(codesNationsFM[uid]));
}

async function chargerNomsCompetitions() {
    try {
        const response = await fetch("/api/noms-competitions", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Format invalide pour les noms de compétitions.");
        }
        competitionNames = new Map(Object.entries(data));
        leagueNamesByTeam.clear();
        if (rawData.joueurs.length || rawData.staff.length) filtrerTout();
        if (entSel && modal.style.display === "flex") refreshPop();
    } catch (error) {
        competitionNamesError = error.message || "Erreur inconnue";
        console.error("Chargement des noms de compétitions impossible :", error);
        if (rawData.joueurs.length || rawData.staff.length) {
            actualiserStatutBase();
        } else {
            st.innerText = `⚠️ Noms de compétitions indisponibles : ${competitionNamesError}`;
            st.style.color = "#f1c40f";
        }
    }
}

const nomsStats = {
    crossing: "Centre", dribbling: "Dribble", finishing: "Finition", heading: "Jeu de tête",
    long_shots: "Tirs de loin", marking: "Marquage", off_the_ball: "Appels de balle",
    passing: "Passes", penalty_taking: "Penaltys", tackling: "Tacles", vision: "Vision",
    handling: "Prises de balle", aerial_reach: "Détente aérienne", command_of_area: "Autorité",
    communication: "Communication", kicking: "Dégagements", throwing: "Relances",
    anticipation: "Anticipation", decisions: "Décisions", one_on_ones: "Face-à-face",
    positioning: "Placement", reflexes: "Réflexes", first_touch: "Contrôle de balle",
    technique: "Technique", flair: "Inspiration", corners: "Corners", teamwork: "Collectif",
    work_rate: "Volume de jeu", long_throws: "Longues touches", eccentricity: "Excentricité",
    rushing_out: "Sorties", punching: "Jeu au poing", acceleration: "Accélération",
    free_kick_taking: "Coups francs", strength: "Force", stamina: "Endurance", pace: "Vitesse",
    jumping_reach: "Détente", leadership: "Leadership", dirtiness: "Antijeu",
    balance: "Équilibre", bravery: "Courage", consistency: "Régularité",
    aggression: "Agressivité", agility: "Agilité", important_matches: "Matchs importants",
    injury_proneness: "Fragilité", versatility: "Polyvalence", natural_fitness: "Condition naturelle",
    determination: "Détermination", composure: "Sang-froid", concentration: "Concentration",
    adaptability: "Adaptabilité"
};

const explicationsAttributs = {
    crossing: "Précision et qualité des centres envoyés dans la surface.",
    dribbling: "Capacité à conserver le ballon et à éliminer un adversaire balle au pied.",
    finishing: "Précision pour conclure les occasions de but.",
    heading: "Précision des têtes, notamment pour reprendre centres et coups de pied arrêtés.",
    long_shots: "Précision des tirs tentés depuis l’extérieur de la surface.",
    marking: "Capacité à suivre et à contrôler un adversaire.",
    off_the_ball: "Capacité à se démarquer et à trouver des espaces sans le ballon.",
    passing: "Précision des passes vers les partenaires.",
    penalty_taking: "Précision lors de l’exécution des penalties.",
    tackling: "Capacité à retirer le ballon à un adversaire par un tacle.",
    vision: "Capacité à repérer les appels et les options de passe.",
    handling: "Sûreté du gardien pour capter et conserver le ballon.",
    aerial_reach: "Capacité du gardien à atteindre les ballons aériens.",
    command_of_area: "Autorité du gardien pour gérer les ballons dans sa surface.",
    communication: "Capacité du gardien à organiser et guider sa défense.",
    kicking: "Précision et longueur des dégagements au pied du gardien.",
    throwing: "Précision des relances à la main du gardien.",
    anticipation: "Capacité à prévoir les actions et les déplacements adverses.",
    decisions: "Qualité du choix effectué dans une situation de jeu.",
    one_on_ones: "Capacité du gardien à faire face à un adversaire en un contre un.",
    positioning: "Capacité à se placer au bon endroit selon la situation.",
    reflexes: "Vitesse de réaction du gardien face aux tirs et déviations.",
    first_touch: "Qualité du premier contrôle à la réception du ballon.",
    technique: "Aisance technique dans l’exécution des gestes avec le ballon.",
    flair: "Capacité à tenter des actions créatives ou inattendues.",
    corners: "Précision des corners tirés.",
    teamwork: "Capacité à coopérer et à jouer pour l’équipe.",
    work_rate: "Intensité et régularité des efforts fournis pendant le match.",
    long_throws: "Longueur et qualité des touches longues.",
    eccentricity: "Tendance du gardien à tenter des actions inhabituelles ou risquées.",
    rushing_out: "Capacité du gardien à sortir rapidement de sa ligne pour intervenir.",
    punching: "Capacité du gardien à dégager les ballons aériens du poing.",
    acceleration: "Vitesse à laquelle le joueur atteint sa vitesse de pointe.",
    free_kick_taking: "Précision des coups francs tirés directement ou indirectement.",
    strength: "Capacité à résister aux contacts et à protéger le ballon.",
    stamina: "Capacité à maintenir les efforts au cours du match.",
    pace: "Vitesse maximale atteinte en course.",
    jumping_reach: "Hauteur atteinte lors d’un saut.",
    leadership: "Capacité à guider, encourager et influencer les partenaires.",
    dirtiness: "Tendance à employer des gestes antisportifs ou à enfreindre les règles.",
    balance: "Capacité à garder l’équilibre en course et dans les duels.",
    bravery: "Volonté de s’engager malgré le risque de contact ou de blessure.",
    consistency: "Régularité des performances d’un match à l’autre.",
    aggression: "Intensité avec laquelle le joueur s’engage dans les duels.",
    agility: "Capacité à changer rapidement de direction et à se déplacer avec souplesse.",
    important_matches: "Capacité à maintenir son niveau lors des matchs importants.",
    injury_proneness: "Tendance à se blesser : une valeur élevée indique davantage de risque.",
    versatility: "Capacité à s’adapter à différents postes ou rôles.",
    natural_fitness: "Capacité à conserver sa condition physique et à la retrouver.",
    determination: "Volonté de poursuivre ses efforts et de réussir.",
    composure: "Capacité à garder son calme sous pression.",
    concentration: "Capacité à rester attentif et à limiter les erreurs.",
    adaptability: "Capacité à s’adapter à de nouvelles situations et à un nouvel environnement."
};

const statutsEffectifFrancais = {
    youngster: "Jeune",
    future_prospect: "Espoir à long terme",
    breakthrough_prospect: "Espoir de l’équipe première",
    fringe_player: "Joueur de complément",
    cup_goalkeeper: "Gardien de coupe",
    regular_starter: "Titulaire régulier",
    important_player: "Joueur important",
    star_player: "Joueur vedette",
    key_player: "Joueur clé",
    squad_player: "Joueur de l’effectif",
    backup: "Remplaçant",
    emergency_backup: "Remplaçant d’urgence",
    goalkeeper_emergency_backup: "Gardien remplaçant d’urgence",
    first_choice_goalkeeper: "Gardien titulaire",
    domestic_cup_goalkeeper: "Gardien de coupe nationale",
    impact_sub: "Remplaçant d’impact",
    b_team_regular: "Titulaire de l’équipe réserve",
    surplus_to_requirements: "N’entre pas dans les plans",
    not_needed: "Non requis",
    first_team: "Équipe première",
    prospect: "Espoir",
    unknown: "Non renseigné"
};

const attributsParFamille = {
    Technique: ["corners", "crossing", "dribbling", "finishing", "first_touch", "free_kick_taking", "heading", "long_shots", "long_throws", "marking", "passing", "penalty_taking", "tackling", "technique"],
    Mental: ["aggression", "anticipation", "bravery", "composure", "concentration", "decisions", "determination", "flair", "leadership", "off_the_ball", "positioning", "teamwork", "vision", "work_rate"],
    Physique: ["acceleration", "agility", "balance", "jumping_reach", "natural_fitness", "pace", "stamina", "strength"],
    "Autres attributs": ["adaptability", "consistency", "dirtiness", "important_matches", "injury_proneness", "versatility"]
};

const roles = {
    // 1. Gardien de but (GB)
    gardien: { nom: "Gardien de but", phase: "les-deux", stats: ["reflexes", "one_on_ones", "handling", "aerial_reach", "positioning"], postes: ["gk"] },
    gardien_relanceur: { nom: "Gardien relanceur / balle au pied", phase: "avec", stats: ["passing", "kicking", "decisions", "first_touch", "composure"], postes: ["gk"] },
    gardien_pragmatique: { nom: "Gardien pragmatique", phase: "avec", stats: ["kicking", "handling", "reflexes", "strength", "decisions"], postes: ["gk"] },
    gardien_libero: { nom: "Gardien-libéro", phase: "sans", stats: ["reflexes", "one_on_ones", "rushing_out", "handling", "decisions"], postes: ["gk"] },
    gardien_ligne: { nom: "Gardien de ligne", phase: "sans", stats: ["reflexes", "positioning", "handling", "concentration", "anticipation"], postes: ["gk"] },

    // 2. Défenseur central (DC)
    defenseur_central: { nom: "Défenseur central", phase: "les-deux", stats: ["tackling", "marking", "positioning", "heading", "strength", "anticipation"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_relanceur: { nom: "Défenseur relanceur", phase: "avec", stats: ["tackling", "marking", "positioning", "passing", "technique", "decisions"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_strict: { nom: "Défenseur central strict", phase: "avec", stats: ["heading", "strength", "tackling", "marking", "positioning"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_avance: { nom: "Défenseur central avancé", phase: "avec", stats: ["passing", "dribbling", "decisions", "first_touch", "technique"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_excentre: { nom: "Défenseur central excentré", phase: "avec", stats: ["pace", "passing", "positioning", "tackling", "stamina"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_dedouble: { nom: "Défenseur central dédoublé", phase: "avec", stats: ["pace", "stamina", "crossing", "dribbling", "off_the_ball"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_arreteur: { nom: "Défenseur central stoppeur", phase: "sans", stats: ["tackling", "strength", "decisions", "anticipation", "aggression"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_couvrant: { nom: "Défenseur central en couverture", phase: "sans", stats: ["pace", "positioning", "decisions", "anticipation", "concentration"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_excentre_arreteur: { nom: "Défenseur central excentré stoppeur", phase: "sans", stats: ["tackling", "strength", "decisions", "anticipation", "pace"], postes: ["dc", "dcg", "dcd", "sw"] },
    defenseur_central_excentre_couvrant: { nom: "Défenseur central excentré en couverture", phase: "sans", stats: ["pace", "positioning", "decisions", "anticipation", "concentration"], postes: ["dc", "dcg", "dcd", "sw"] },

    // 3. Défenseur latéral (DD / DG)
    lateral: { nom: "Défenseur latéral", phase: "les-deux", stats: ["tackling", "marking", "pace", "stamina", "crossing", "work_rate"], postes: ["dr", "dl"] },
    lateral_rentrant: { nom: "Latéral intérieur", phase: "avec", stats: ["passing", "positioning", "decisions", "first_touch", "tackling"], postes: ["dr", "dl"] },
    lateral_pressant: { nom: "Latéral presseur", phase: "sans", stats: ["work_rate", "stamina", "tackling", "aggression", "anticipation"], postes: ["dr", "dl"] },
    lateral_tenant: { nom: "Latéral de maintien / en position", phase: "sans", stats: ["positioning", "marking", "decisions", "concentration", "tackling"], postes: ["dr", "dl"] },

    // 4. Latéral offensif (ALD / ALG)
    piston: { nom: "Latéral offensif", phase: "les-deux", stats: ["crossing", "dribbling", "pace", "acceleration", "stamina", "work_rate"], postes: ["wbr", "wbl"] },
    piston_avance: { nom: "Latéral offensif avancé", phase: "avec", stats: ["crossing", "pace", "stamina", "dribbling", "off_the_ball"], postes: ["wbr", "wbl"] },
    piston_rentrant: { nom: "Latéral intérieur offensif", phase: "avec", stats: ["passing", "decisions", "stamina", "positioning", "first_touch"], postes: ["wbr", "wbl"] },
    piston_meneur: { nom: "Latéral offensif organisateur", phase: "avec", stats: ["passing", "vision", "first_touch", "technique", "decisions"], postes: ["wbr", "wbl"] },
    piston_couvrant: { nom: "Latéral offensif de maintien", phase: "sans", stats: ["positioning", "marking", "tackling", "concentration", "stamina"], postes: ["wbr", "wbl"] },
    piston_pressant: { nom: "Latéral offensif presseur", phase: "sans", stats: ["work_rate", "stamina", "pace", "aggression", "anticipation"], postes: ["wbr", "wbl"] },

    // 5. Milieu défensif (MD)
    milieu_recuperateur: { nom: "Milieu défensif", phase: "les-deux", stats: ["tackling", "positioning", "work_rate", "stamina", "anticipation"], postes: ["dm", "mdg", "mdd"] },
    meneur_retrait: { nom: "Meneur de jeu en retrait", phase: "avec", stats: ["passing", "vision", "technique", "decisions", "first_touch"], postes: ["dm", "mdg", "mdd"] },
    demi_centre: { nom: "Demi-centre", phase: "avec", stats: ["positioning", "passing", "decisions", "tackling", "anticipation"], postes: ["dm", "mdg", "mdd"] },
    milieu_recuperateur_pressant: { nom: "Milieu défensif presseur", phase: "sans", stats: ["work_rate", "tackling", "stamina", "aggression", "anticipation"], postes: ["dm", "mdg", "mdd"] },
    milieu_recuperateur_decrochant: { nom: "Milieu défensif décrochant", phase: "sans", stats: ["positioning", "marking", "tackling", "concentration", "decisions"], postes: ["dm", "mdg", "mdd"] },
    milieu_recuperateur_ecran: { nom: "Milieu défensif écran", phase: "sans", stats: ["positioning", "decisions", "marking", "concentration", "anticipation"], postes: ["dm", "mdg", "mdd"] },
    milieu_recuperateur_couvrant_large: { nom: "Milieu défensif de couverture large", phase: "sans", stats: ["stamina", "work_rate", "positioning", "pace", "teamwork"], postes: ["dm", "mdg", "mdd"] },

    // 6. Milieu central (MC)
    milieu_central: { nom: "Milieu axial", phase: "les-deux", stats: ["passing", "decisions", "work_rate", "stamina", "teamwork"], postes: ["mc", "mcg", "mcd"] },
    meneur_central: { nom: "Milieu de terrain organisateur", phase: "avec", stats: ["passing", "vision", "first_touch", "decisions", "technique"], postes: ["mc", "mcg", "mcd"] },
    box_to_box: { nom: "Milieu box-to-box", phase: "avec", stats: ["stamina", "work_rate", "teamwork", "passing", "tackling", "off_the_ball"], postes: ["mc", "mcg", "mcd"] },
    box_to_box_meneur: { nom: "Meneur de jeu box-to-box", phase: "avec", stats: ["passing", "stamina", "vision", "off_the_ball", "work_rate"], postes: ["mc", "mcg", "mcd"] },
    milieu_de_couloir: { nom: "Milieu de couloir / d'intervalle", phase: "avec", stats: ["off_the_ball", "dribbling", "pace", "acceleration", "first_touch"], postes: ["mc", "mcg", "mcd"] },
    milieu_central_pressant: { nom: "Milieu axial presseur", phase: "sans", stats: ["work_rate", "stamina", "tackling", "aggression", "anticipation"], postes: ["mc", "mcg", "mcd"] },
    milieu_central_ecran: { nom: "Milieu axial écran", phase: "sans", stats: ["positioning", "decisions", "marking", "concentration", "anticipation"], postes: ["mc", "mcg", "mcd"] },
    milieu_central_couvrant_large: { nom: "Milieu axial de couverture large", phase: "sans", stats: ["stamina", "work_rate", "positioning", "teamwork", "concentration"], postes: ["mc", "mcg", "mcd"] },

    // 7. Milieu latéral (MD / MG)
    milieu_excentre: { nom: "Milieu latéral", phase: "les-deux", stats: ["work_rate", "crossing", "stamina", "positioning", "teamwork"], postes: ["mr", "ml"] },
    milieu_excentre_axial: { nom: "Milieu axial excentré", phase: "avec", stats: ["passing", "decisions", "first_touch", "technique", "positioning"], postes: ["mr", "ml"] },
    milieu_excentre_repliant: { nom: "Milieu latéral de repli", phase: "sans", stats: ["work_rate", "stamina", "marking", "tackling", "positioning"], postes: ["mr", "ml"] },
    milieu_excentre_sortie_large: { nom: "Milieu latéral de sortie large", phase: "sans", stats: ["pace", "off_the_ball", "first_touch", "acceleration", "finishing"], postes: ["mr", "ml"] },

    // 8. Milieu offensif central (MOC)
    milieu_offensif: { nom: "Milieu offensif", phase: "les-deux", stats: ["technique", "dribbling", "first_touch", "off_the_ball", "finishing"], postes: ["amc"] },
    meneur_avance: { nom: "Meneur de jeu avancé", phase: "avec", stats: ["technique", "passing", "vision", "dribbling", "first_touch", "decisions"], postes: ["amc"] },
    electron_libre: { nom: "Électron libre", phase: "avec", stats: ["vision", "dribbling", "off_the_ball", "flair", "decisions"], postes: ["amc"] },
    milieu_offensif_repliant: { nom: "Milieu offensif de repli", phase: "sans", stats: ["work_rate", "stamina", "marking", "anticipation", "positioning"], postes: ["amc"] },
    milieu_offensif_sortie_centrale: { nom: "Milieu offensif de sortie axiale", phase: "sans", stats: ["off_the_ball", "first_touch", "pace", "acceleration", "composure"], postes: ["amc"] },
    milieu_offensif_sortie_pivot: { nom: "Milieu offensif de sortie en intervalle", phase: "sans", stats: ["off_the_ball", "pace", "first_touch", "acceleration", "dribbling"], postes: ["amc"] },

    // 9. Ailier / Milieu offensif excentré (MOD / MOG)
    ailier: { nom: "Ailier", phase: "les-deux", stats: ["dribbling", "crossing", "pace", "acceleration", "technique"], postes: ["amr", "aml"] },
    ailier_rentrant: { nom: "Ailier intérieur", phase: "avec", stats: ["dribbling", "passing", "off_the_ball", "first_touch", "technique"], postes: ["amr", "aml"] },
    ailier_demi_axe: { nom: "Ailier de demi-espace", phase: "avec", stats: ["passing", "off_the_ball", "first_touch", "technique", "positioning"], postes: ["amr", "aml"] },
    meneur_excentre: { nom: "Meneur de jeu excentré", phase: "avec", stats: ["passing", "vision", "technique", "dribbling", "crossing"], postes: ["amr", "aml"] },
    attaquant_excentre: { nom: "Attaquant excentré", phase: "avec", stats: ["finishing", "off_the_ball", "pace", "acceleration", "composure"], postes: ["amr", "aml"] },
    attaquant_interieur: { nom: "Attaquant intérieur", phase: "avec", stats: ["finishing", "dribbling", "off_the_ball", "first_touch", "composure"], postes: ["amr", "aml"] },
    ailier_repliant: { nom: "Ailier de repli", phase: "sans", stats: ["work_rate", "stamina", "marking", "tackling", "positioning"], postes: ["amr", "aml"] },
    ailier_sortie_large: { nom: "Ailier de sortie large", phase: "sans", stats: ["pace", "off_the_ball", "first_touch", "acceleration", "crossing"], postes: ["amr", "aml"] },
    ailier_sortie_rentrant: { nom: "Ailier de sortie intérieure", phase: "sans", stats: ["pace", "off_the_ball", "finishing", "acceleration", "dribbling"], postes: ["amr", "aml"] },

    // 10. Buteur / Attaquant (BT)
    attaquant_axial: { nom: "Avant-centre", phase: "les-deux", stats: ["finishing", "off_the_ball", "first_touch", "composure", "positioning"], postes: ["stc", "btg", "btd"] },
    attaquant_pivot: { nom: "Attaquant pivot", phase: "avec", stats: ["heading", "strength", "first_touch", "jumping_reach", "finishing"], postes: ["stc", "btg", "btd"] },
    renard_surfaces: { nom: "Renard des surfaces", phase: "avec", stats: ["finishing", "off_the_ball", "pace", "composure", "acceleration"], postes: ["stc", "btg", "btd"] },
    attaquant_retrait: { nom: "Attaquant en retrait", phase: "avec", stats: ["first_touch", "passing", "strength", "decisions", "technique"], postes: ["stc", "btg", "btd"] },
    faux_neuf: { nom: "Faux neuf", phase: "avec", stats: ["passing", "vision", "first_touch", "technique", "composure"], postes: ["stc", "btg", "btd"] },
    attaquant_canal: { nom: "Attaquant de couloir", phase: "avec", stats: ["pace", "off_the_ball", "work_rate", "acceleration", "anticipation"], postes: ["stc", "btg", "btd"] },
    second_attaquant: { nom: "Deuxième attaquant", phase: "avec", stats: ["off_the_ball", "finishing", "first_touch", "acceleration", "composure"], postes: ["stc", "btg", "btd"] },
    attaquant_demi_axe: { nom: "Attaquant de demi-espace", phase: "avec", stats: ["off_the_ball", "passing", "dribbling", "first_touch", "technique"], postes: ["stc", "btg", "btd"] },
    attaquant_repliant: { nom: "Avant-centre de repli", phase: "sans", stats: ["work_rate", "stamina", "marking", "tackling", "positioning"], postes: ["stc", "btg", "btd"] },
    attaquant_sortie_centrale: { nom: "Avant-centre de sortie axiale", phase: "sans", stats: ["off_the_ball", "strength", "first_touch", "finishing", "composure"], postes: ["stc", "btg", "btd"] },
    attaquant_sortie_pivot: { nom: "Avant-centre de sortie en intervalle", phase: "sans", stats: ["pace", "off_the_ball", "finishing", "acceleration", "anticipation"], postes: ["stc", "btg", "btd"] }
};

const postes = {
    gk: "Gardien de but (GB)", sw: "Libéro", dr: "Défenseur droit (DD)", dl: "Défenseur gauche (DG)",
    dc: "Défenseur central (DC)", dcg: "Défenseur central gauche (DCG)", dcd: "Défenseur central droit (DCD)",
    dm: "Milieu défensif (MD)", mdg: "Milieu défensif gauche (MDG)", mdd: "Milieu défensif droit (MDD)",
    mc: "Milieu central (MC)", mcg: "Milieu central gauche (MCG)", mcd: "Milieu central droit (MCD)",
    mr: "Milieu latéral droit (MD)", ml: "Milieu latéral gauche (MG)", amr: "Ailier droit / Milieu offensif excentré droit (MOD)",
    aml: "Ailier gauche / Milieu offensif excentré gauche (MOG)", amc: "Milieu offensif central (MOC)", stc: "Buteur / Attaquant (BT)",
    btg: "Attaquant gauche (BTG)", btd: "Attaquant droit (BTD)",
    wbr: "Latéral offensif droit (ALD)", wbl: "Latéral offensif gauche (ALG)"
};

const metiersFrancais = {
    "unknown": "Fonction inconnue",
    "manager": "Entraîneur principal",
    "physio": "Kinésithérapeute",
    "coach": "Entraîneur",
    "assistant manager": "Entraîneur adjoint",
    "scout": "Recruteur",
    "goalkeeping coach": "Entraîneur des gardiens",
    "performance analyst": "Analyste de performance",
    "director": "Directeur",
    "head physio": "Kinésithérapeute en chef",
    "director of football": "Directeur sportif",
    "chairperson": "Président",
    "sports scientist": "Scientifique du sport",
    "head of youth development": "Responsable de la formation",
    "chief doctor": "Médecin-chef",
    "head of sports science": "Responsable des sciences du sport",
    "managing director": "Directeur général",
    "technical director": "Directeur technique"
};

const codePosteNom = {
    GK: "gk", GB: "gk", SW: "sw", LIB: "sw", DR: "dr", DD: "dr", DL: "dl", DG: "dl",
    DC: "dc", DCG: "dc", DCD: "dc", DM: "dm", MDF: "dm", MDG: "dm", MDD: "dm", MC: "mc", MCG: "mc", MCD: "mc", MR: "mr", MD: "mr", ML: "ml", MG: "ml",
    MG: "ml", AMR: "amr", MOD: "amr", AML: "aml", MOG: "aml", AMC: "amc",
    MOC: "amc", STC: "stc", ST: "stc", BT: "stc", BTG: "stc", BTD: "stc", WBR: "wbr", WBL: "wbl", PDD: "wbr", PDG: "wbl"
};

const ordrePostesTerrain = [
    "gk", "sw", "dl", "wbl", "dc", "dr", "wbr",
    "dm", "ml", "mc", "mr", "aml", "amc", "amr", "stc"
];
const rangPosteTerrain = new Map(ordrePostesTerrain.map((position, index) => [position, index]));

const rolesParPoste = {
    gk: ["gardien", "gardien_relanceur", "gardien_pragmatique", "gardien_libero", "gardien_ligne"],
    goalkeeper: ["gardien", "gardien_relanceur", "gardien_pragmatique", "gardien_libero", "gardien_ligne"],
    sw: ["defenseur_central", "defenseur_relanceur", "defenseur_central_strict", "defenseur_central_avance", "defenseur_central_excentre", "defenseur_central_dedouble", "defenseur_central_arreteur", "defenseur_central_couvrant", "defenseur_central_excentre_arreteur", "defenseur_central_excentre_couvrant"],
    dr: ["lateral", "lateral_rentrant", "lateral_pressant", "lateral_tenant"],
    dl: ["lateral", "lateral_rentrant", "lateral_pressant", "lateral_tenant"],
    dc: ["defenseur_central", "defenseur_relanceur", "defenseur_central_strict", "defenseur_central_avance", "defenseur_central_excentre", "defenseur_central_dedouble", "defenseur_central_arreteur", "defenseur_central_couvrant", "defenseur_central_excentre_arreteur", "defenseur_central_excentre_couvrant"],
    dcg: ["defenseur_central", "defenseur_relanceur", "defenseur_central_strict", "defenseur_central_avance", "defenseur_central_excentre", "defenseur_central_dedouble", "defenseur_central_arreteur", "defenseur_central_couvrant", "defenseur_central_excentre_arreteur", "defenseur_central_excentre_couvrant"],
    dcd: ["defenseur_central", "defenseur_relanceur", "defenseur_central_strict", "defenseur_central_avance", "defenseur_central_excentre", "defenseur_central_dedouble", "defenseur_central_arreteur", "defenseur_central_couvrant", "defenseur_central_excentre_arreteur", "defenseur_central_excentre_couvrant"],
    dm: ["milieu_recuperateur", "meneur_retrait", "demi_centre", "milieu_recuperateur_pressant", "milieu_recuperateur_decrochant", "milieu_recuperateur_ecran", "milieu_recuperateur_couvrant_large"],
    mdg: ["milieu_recuperateur", "meneur_retrait", "demi_centre", "milieu_recuperateur_pressant", "milieu_recuperateur_decrochant", "milieu_recuperateur_ecran", "milieu_recuperateur_couvrant_large"],
    mdd: ["milieu_recuperateur", "meneur_retrait", "demi_centre", "milieu_recuperateur_pressant", "milieu_recuperateur_decrochant", "milieu_recuperateur_ecran", "milieu_recuperateur_couvrant_large"],
    mc: ["milieu_central", "meneur_central", "box_to_box", "box_to_box_meneur", "milieu_de_couloir", "milieu_central_pressant", "milieu_central_ecran", "milieu_central_couvrant_large"],
    mcg: ["milieu_central", "meneur_central", "box_to_box", "box_to_box_meneur", "milieu_de_couloir", "milieu_central_pressant", "milieu_central_ecran", "milieu_central_couvrant_large"],
    mcd: ["milieu_central", "meneur_central", "box_to_box", "box_to_box_meneur", "milieu_de_couloir", "milieu_central_pressant", "milieu_central_ecran", "milieu_central_couvrant_large"],
    mr: ["milieu_excentre", "milieu_excentre_axial", "milieu_excentre_repliant", "milieu_excentre_sortie_large"],
    ml: ["milieu_excentre", "milieu_excentre_axial", "milieu_excentre_repliant", "milieu_excentre_sortie_large"],
    amr: ["ailier", "ailier_rentrant", "ailier_demi_axe", "meneur_excentre", "attaquant_excentre", "attaquant_interieur", "ailier_repliant", "ailier_sortie_large", "ailier_sortie_rentrant"],
    aml: ["ailier", "ailier_rentrant", "ailier_demi_axe", "meneur_excentre", "attaquant_excentre", "attaquant_interieur", "ailier_repliant", "ailier_sortie_large", "ailier_sortie_rentrant"],
    amc: ["milieu_offensif", "meneur_avance", "electron_libre", "milieu_offensif_repliant", "milieu_offensif_sortie_centrale", "milieu_offensif_sortie_pivot"],
    stc: ["attaquant_axial", "attaquant_pivot", "renard_surfaces", "attaquant_retrait", "faux_neuf", "attaquant_canal", "second_attaquant", "attaquant_demi_axe", "attaquant_repliant", "attaquant_sortie_centrale", "attaquant_sortie_pivot"],
    btg: ["attaquant_axial", "attaquant_pivot", "renard_surfaces", "attaquant_retrait", "faux_neuf", "attaquant_canal", "second_attaquant", "attaquant_demi_axe", "attaquant_repliant", "attaquant_sortie_centrale", "attaquant_sortie_pivot"],
    btd: ["attaquant_axial", "attaquant_pivot", "renard_surfaces", "attaquant_retrait", "faux_neuf", "attaquant_canal", "second_attaquant", "attaquant_demi_axe", "attaquant_repliant", "attaquant_sortie_centrale", "attaquant_sortie_pivot"],
    wbr: ["piston", "piston_avance", "piston_rentrant", "piston_meneur", "piston_couvrant", "piston_pressant"],
    wbl: ["piston", "piston_avance", "piston_rentrant", "piston_meneur", "piston_couvrant", "piston_pressant"]
};

const clePoste = {
    gk: "gk", sw: "sw", dr: "dr", dl: "dl", dc: "dc", dcg: "dc", dcd: "dc", dm: "dm", mdg: "dm", mdd: "dm", mc: "mc", mcg: "mc", mcd: "mc",
    mr: "mr", ml: "ml", amr: "amr", aml: "aml", amc: "amc", stc: "stc",
    wbr: "wbr", wbl: "wbl",
    goalkeeper: "gk", defender_right: "dr", defender_left: "dl", defender_centre: "dc",
    defensive_midfielder: "dm", midfielder_centre: "mc", midfielder_right: "mr", midfielder_left: "ml",
    attacking_midfielder_right: "amr", attacking_midfielder_left: "aml",
    attacking_midfielder_centre: "amc", striker_centre: "stc"
};
const aliasPostesAnglais = {
    keeper: "gk", libero: "sw", sweeper: "sw",
    right_back: "dr", right_full_back: "dr", right_defender: "dr",
    left_back: "dl", left_full_back: "dl", left_defender: "dl",
    centre_back: "dc", center_back: "dc", central_defender: "dc", defender_center: "dc",
    central_midfielder: "mc", centre_midfielder: "mc",
    right_midfield: "mr", left_midfield: "ml",
    right_winger: "amr", right_wing: "amr", winger_right: "amr",
    left_winger: "aml", left_wing: "aml", winger_left: "aml",
    central_attacking_midfielder: "amc", attacking_midfielder_center: "amc",
    striker: "stc", centre_forward: "stc", center_forward: "stc", forward: "stc",
    right_wing_back: "wbr", wing_back_right: "wbr",
    left_wing_back: "wbl", wing_back_left: "wbl",
    right_attacking_full_back: "wbr", left_attacking_full_back: "wbl",
    d_r: "dr", d_l: "dl", d_c: "dc", m_c: "mc", m_r: "mr", m_l: "ml",
    am_r: "amr", am_l: "aml", am_c: "amc", st_c: "stc", wb_r: "wbr", wb_l: "wbl"
};
const codesPosteFrancais = {
    gk: "GB", sw: "LIB", dr: "DD", dl: "DG", dc: "DC", dcg: "DCG", dcd: "DCD", dm: "MDF", mdg: "MDG", mdd: "MDD", mc: "MC",
    mcg: "MCG", mcd: "MCD", mr: "MD", ml: "MG", amr: "MOD", aml: "MOG", amc: "MOC", stc: "BT",
    btg: "BTG", btd: "BTD", wbr: "ALD", wbl: "ALG"
};
const codesPosteParAbreviation = new Map(Object.entries(codesPosteFrancais).map(([code, abreviation]) => [abreviation, code]));

saveInput.addEventListener("change", () => {
    extractButton.disabled = !saveInput.files?.length;
    extractButton.textContent = saveInput.files?.length
        ? `Extraire : ${saveInput.files[0].name}`
        : "Choisir une sauvegarde .fm";
});
extractButton.addEventListener("click", extraireDepuisLeSite);
sidebarToggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    sidebarToggle.setAttribute("aria-label", collapsed ? "Réouvrir le panneau latéral" : "Réduire le panneau latéral");
    sidebarToggle.title = collapsed ? "Réouvrir le panneau latéral" : "Réduire le panneau latéral";
    sidebarToggle.textContent = collapsed ? "›" : "‹";
});
modal.addEventListener("click", event => {
    if (event.target === modal) fermerBulle();
});
document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    document.querySelectorAll("#club-view .club-menu[open]").forEach(menu => {
        if (!menu.contains(event.target)) menu.open = false;
    });
    const profileLink = event.target.closest("[data-profile-kind]");
    if (!profileLink) return;
    if (modal.contains(profileLink) && profileLink.dataset.profileCopyName === "true"
        && ["joueur", "staff"].includes(profileLink.dataset.profileKind)) {
        event.preventDefault();
        event.stopPropagation();
        void copierNomProfil(profileLink.dataset.profileName || profileLink.textContent.trim());
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    ouvrirProfil(profileLink.dataset.profileKind, profileLink.dataset.profileId, profileLink.dataset.profileName,
        profileLink.dataset.profilePosition, profileLink.dataset.profileRole);
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.getElementById("license-gate").style.display === "flex") fermerAccesPremium();
    else if (event.key === "Escape" && modal.style.display === "flex") fermerBulle();
    else if (event.key === "Escape") {
        const menu = document.querySelector("#club-view .club-menu[open]");
        if (menu) {
            menu.open = false;
            menu.querySelector("summary").focus();
        }
    }
});
document.querySelectorAll("#player-filters input, #player-filters select").forEach(control => {
    control.addEventListener(control.tagName === "SELECT" ? "change" : "input", filtrerTout);
});
const attributeFilterRows = document.getElementById("attribute-filter-rows");
document.getElementById("add-attribute-filter").addEventListener("click", ajouterFiltreAttribut);
attributeFilterRows.addEventListener("input", event => {
    if (event.target.tagName !== "SELECT") filtrerTout();
});
attributeFilterRows.addEventListener("change", event => {
    if (event.target.tagName === "SELECT") filtrerTout();
});
attributeFilterRows.addEventListener("click", event => {
    const button = event.target.closest("button[data-remove-attribute]");
    if (!button) return;
    button.closest(".attribute-filter-row").remove();
    filtrerTout();
});
document.getElementById("clear-player-filters").addEventListener("click", () => {
    document.querySelectorAll("#player-filters input").forEach(input => {
        if (input.type === "checkbox") input.checked = false;
        else input.value = "";
    });
    document.querySelectorAll("#player-filters select").forEach(select => { select.value = ""; });
    document.getElementById("marge-reputation").value = "1000";
    document.getElementById("marge-reputation-valeur").textContent = "+1000";
    attributeFilterRows.replaceChildren();
    filtrerTout();
});
document.getElementById("active-player-filters").addEventListener("click", event => {
    const clear = event.target.closest("[data-clear-all-filters]");
    if (clear) {
        document.getElementById("se").value = "";
        document.getElementById("chk-mon-club").checked = false;
        document.getElementById("clear-player-filters").click();
        return;
    }
    const button = event.target.closest("[data-active-filter]");
    if (!button) return;
    const id = button.dataset.activeFilter;
    if (id.startsWith("attribut:")) {
        attributeFilterRows.children[Number(id.slice(9))]?.remove();
    } else {
        const control = document.getElementById(id);
        if (control.type === "checkbox") control.checked = false;
        else control.value = id === "marge-reputation" ? "1000" : "";
        if (id === "marge-reputation") document.getElementById("marge-reputation-valeur").textContent = "+1000";
    }
    filtrerTout();
});
document.getElementById("marge-reputation").addEventListener("input", event => {
    document.getElementById("marge-reputation-valeur").textContent = `+${event.target.value}`;
    if (mode === "joueurs" || mode === "club") filtrerTout();
});
document.getElementById("staff-job-filter").addEventListener("change", filtrerTout);

if (scr) {
    scr.addEventListener("scroll", () => {
        if (scr.scrollTop + scr.clientHeight >= scr.scrollHeight - 100 && maxRow < listAct.length) {
            maxRow += 100;
            render(true);
        }
    });
}

function afficherDonnees(data, changementMode = false) {
    if (!data || !Array.isArray(data.joueurs) || !Array.isArray(data.staff)) {
        throw new Error("Le JSON doit contenir les listes joueurs et staff.");
    }
    if (!changementMode) {
        sourceData = data;
        reinitialiserScenario();
        reinitialiserDirecteur();
    }
    const joueurs = modeDecouverte ? data.joueurs.map(player => ({ ...player, ca: null, pa: null })) : data.joueurs;
    const staff = modeDecouverte ? data.staff.map(person => ({ ...person, ca: null, pa: null })) : data.staff;
    rawData = {
        ...data,
        joueurs,
        staff,
        clubs: Array.isArray(data.clubs) ? data.clubs : [],
        tactiques: Array.isArray(data.tactiques) ? data.tactiques : [],
        selections: Array.isArray(data.selections) ? data.selections : [],
        cadre_financier: data.cadre_financier || {},
        club_gere: data.club_gere || null
    };
    actualiserPortraits();
    clubIndexByName = new Map(rawData.clubs.map(club => [String(club.name || "").trim(), club]));
    clubIndexById = new Map(rawData.clubs.map(club => [String(club.uid), club]));
    leagueNamesByTeam.clear();
    appliquerThemeClub(rawData.club_gere);
    alimenterFiltresStaff();
    alimenterTactiques();
    afficherEvaluationStaff();
    if (!modeDecouverte && !changementMode) actualiserAlertesChargement();
    if (!changementMode) capturerEvolution();
    chargerPonderations();
    if (!changementMode) {
        clubActiveTab = "overview";
        changerOnglet(mode);
    } else filtrerTout();
    actualiserStatutBase();
    st.style.color = "#2ecc71";
}

function basculerDecouverte(event) {
    modeDecouverte = event.target.checked;
    if (modeDecouverte && (clubRosterSort === "ca" || clubRosterSort === "pa")) {
        clubRosterSort = "poste";
        clubRosterAscending = true;
    }
    document.body.classList.toggle("mode-decouverte", modeDecouverte);
    ["ca-min", "ca-max", "pa-min", "pa-max"].forEach(id => {
        const input = document.getElementById(id);
        input.value = "";
        input.disabled = modeDecouverte;
    });
    fermerBulle();
    entSel = null;
    if (sourceData) {
        const tactic = document.getElementById("tactique-select").value;
        afficherDonnees(sourceData, true);
        document.getElementById("tactique-select").value = tactic;
        filtrerTout();
    }
    document.getElementById("discovery-status").textContent = modeDecouverte
        ? "CA et PA masqués. Les filtres et classements basés sur ces valeurs sont désactivés ; les alertes CA ne sont pas modifiées."
        : "CA et PA affichés.";
}

function normaliserNomVisage(name) {
    return [...String(name || "").normalize("NFKD").toLocaleLowerCase("en")]
        .filter(character => /[\p{L}\p{N}]/u.test(character) && !/\p{M}/u.test(character))
        .join("")
        .replace(/ß/g, "ss");
}

function actualiserPortraits() {
    const people = [...rawData.joueurs, ...rawData.staff];
    const nameCounts = new Map();
    const idCounts = new Map();
    people.forEach(person => {
        const key = normaliserNomVisage(person.nom);
        nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
        const id = String(person.unique_id ?? "");
        if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });
    let matched = 0;
    people.forEach(person => {
        const key = normaliserNomVisage(person.nom);
        const uniqueId = String(person.unique_id ?? "");
        const id = (idCounts.get(uniqueId) === 1 ? portraitIds.get(uniqueId) : null)
            || (nameCounts.get(key) === 1 ? portraitIndex.get(key) : null);
        person.portrait_id = id && /^(?:r-)?\d+$/.test(id) ? id : null;
        if (person.portrait_id) matched += 1;
    });
    return { matched, total: people.length };
}

function actualiserStatutBase() {
    const { matched, total } = actualiserPortraits();
    const portraits = !portraitsReady
        ? "Visages locaux en cours de chargement…"
        : portraitError
            ? "Visages locaux indisponibles."
            : `${matched} visage(s) associé(s) sur ${total}.`;
    const competitions = competitionNamesError
        ? ` | Noms de compétitions indisponibles : ${competitionNamesError}`
        : "";
    st.innerText = `Base FM lue ! Joueurs : ${rawData.joueurs.length} | Staff : ${rawData.staff.length} | ${portraits}${competitions}`;
}

async function chargerIndexVisages() {
    try {
        const response = await fetch("/api/face-index", { cache: "no-store" });
        if (!response.ok) throw new Error(`Index des visages indisponible (HTTP ${response.status}).`);
        const index = await response.json();
        if (!index || typeof index !== "object" || !index.names || !index.ids
            || typeof index.names !== "object" || typeof index.ids !== "object"
            || Array.isArray(index.names) || Array.isArray(index.ids)) {
            throw new Error("Format invalide pour l’index des visages.");
        }
        portraitIndex = new Map(Object.entries(index.names));
        portraitIds = new Map(Object.entries(index.ids));
    } catch (error) {
        portraitError = error.message || "Impossible de charger l’index des visages.";
        console.error(portraitError);
    } finally {
        portraitsReady = true;
        if (rawData.joueurs.length || rawData.staff.length) {
            actualiserPortraits();
            filtrerTout();
            if (entSel) refreshPop();
            actualiserStatutBase();
        }
    }
}

function appliquerThemeClub(club) {
    const name = String(club?.name || "").trim();
    const crest = document.getElementById("club-crest");
    const clubName = document.getElementById("managed-club-name");
    const headerCrest = document.getElementById("header-club-crest");
    const headerSaveDate = document.getElementById("header-save-date");
    const workspaceTitle = document.getElementById("workspace-title");
    appliquerCouleursClub(club);
    clubName.innerHTML = name ? linkClub(name, club.uid) : "Club en attente de chargement";
    const initials = name
        .split(/\s+/)
        .filter(word => !["fc", "afc", "sc", "cf", "the"].includes(word.toLocaleLowerCase("fr")))
        .slice(0, 2)
        .map(word => [...word][0] || "")
        .join("")
        .toLocaleUpperCase("fr");
    const clubLogo = logoLocalHtml("club", club?.unique_id, `Logo ${name}`);
    crest.classList.toggle("has-logo", Boolean(clubLogo));
    crest.dataset.fallback = initials || "FM";
    crest.innerHTML = clubLogo || escapeHtml(initials || "FM");
    if (headerCrest) {
        headerCrest.classList.toggle("has-logo", Boolean(clubLogo));
        headerCrest.dataset.fallback = initials || "FM";
        headerCrest.innerHTML = clubLogo || escapeHtml(initials || "FM");
    }
    if (workspaceTitle) {
        workspaceTitle.innerHTML = clubLogo + " " + escapeHtml(name || "Mon club");
    }
    if (headerSaveDate && rawData?.date_sauvegarde) {
        headerSaveDate.textContent = `Sauvegarde : ${escapeHtml(rawData.date_sauvegarde)}`;
    }
    document.title = name ? `Assistant FM27 · ${name}` : "Assistant FM2027 Pro";
}

const couleursNeutres = { primaire: "#bdc9cb", secondaire: "#536879" };

function validerCouleursClub(couleurs) {
    if (!couleurs || typeof couleurs !== "object" || Array.isArray(couleurs)
        || typeof couleurs.primaire !== "string" || typeof couleurs.secondaire !== "string"
        || !/^#[0-9a-f]{6}$/i.test(couleurs.primaire)
        || !/^#[0-9a-f]{6}$/i.test(couleurs.secondaire)) {
        throw new Error("Couleurs de club invalides.");
    }
}

function cleCouleursClub(club) {
    if (!/^\d+$/.test(String(club?.unique_id ?? ""))) {
        throw new Error("Identifiant stable du club indisponible : couleurs non enregistrables.");
    }
    return `assistantfm-couleurs-club-v1:${club.unique_id}`;
}

function afficherCouleursTactique(couleurs) {
    document.documentElement.style.setProperty("--shirt-primary", couleurs.primaire);
    document.documentElement.style.setProperty("--shirt-secondary", couleurs.secondaire);
    document.getElementById("club-color-primary").value = couleurs.primaire;
    document.getElementById("club-color-secondary").value = couleurs.secondaire;
}

function appliquerCouleursClub(club) {
    const nom = document.getElementById("club-colors-name");
    const statut = document.getElementById("club-colors-status");
    afficherCouleursTactique(couleursNeutres);
    nom.textContent = club?.name ? `Club affiché : ${club.name}` : "Chargez un club pour choisir ses couleurs.";
    if (!club) {
        statut.textContent = "Les couleurs ne sont pas exportées : affichage neutre.";
        return;
    }
    try {
        const texte = localStorage.getItem(cleCouleursClub(club));
        if (texte === null) {
            statut.textContent = "Couleurs non exportées : choisissez-les pour ce club ; affichage neutre en attendant.";
            return;
        }
        const couleurs = JSON.parse(texte);
        validerCouleursClub(couleurs);
        afficherCouleursTactique(couleurs);
        statut.textContent = "Couleurs choisies manuellement pour ce club.";
    } catch (error) {
        statut.textContent = `Couleurs indisponibles : ${error.message} Affichage neutre.`;
    }
}

function enregistrerCouleursClub() {
    const statut = document.getElementById("club-colors-status");
    try {
        const couleurs = { primaire: document.getElementById("club-color-primary").value,
            secondaire: document.getElementById("club-color-secondary").value };
        validerCouleursClub(couleurs);
        localStorage.setItem(cleCouleursClub(rawData.club_gere), JSON.stringify(couleurs));
        afficherCouleursTactique(couleurs);
        statut.textContent = "Couleurs enregistrées pour ce club dans ce navigateur.";
    } catch (error) {
        statut.textContent = `Enregistrement des couleurs impossible : ${error.message}`;
    }
}

function reinitialiserCouleursClub() {
    const statut = document.getElementById("club-colors-status");
    try {
        localStorage.removeItem(cleCouleursClub(rawData.club_gere));
        appliquerCouleursClub(rawData.club_gere);
    } catch (error) {
        statut.textContent = `Réinitialisation des couleurs impossible : ${error.message}`;
    }
}

async function lireJsonEnFlux(response, onProgress = () => {}) {
    if (!response.body?.getReader) {
        throw new Error("Ce navigateur ne prend pas en charge le chargement progressif requis pour cette sauvegarde.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const total = Number(response.headers?.get("Content-Length")) || 0;
    let buffer = "";
    let index = 0;
    let termine = false;
    let octetsLus = 0;
    let capture = null;

    async function remplir() {
        while (index >= buffer.length && !termine) {
            if (capture) {
                capture.parts.push(buffer.slice(capture.start, index));
                capture.start = 0;
            }
            buffer = buffer.slice(index);
            index = 0;
            const { value, done } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                termine = true;
                break;
            }
            octetsLus += value.byteLength;
            buffer += decoder.decode(value, { stream: true });
            onProgress(octetsLus, total);
        }
    }

    async function caractere() {
        if (index >= buffer.length) await remplir();
        return buffer[index];
    }

    async function espaces() {
        while (true) {
            const caractereCourant = await caractere();
            if (caractereCourant === undefined || !/\s/.test(caractereCourant)) return;
            index++;
        }
    }

    async function valeurBrute() {
        await espaces();
        capture = { parts: [], start: index };
        const premier = await caractere();
        if (premier === undefined) throw new Error("JSON tronqué.");

        if (premier === "{" || premier === "[") {
            let profondeur = 0;
            let dansChaine = false;
            let echappe = false;
            let valeurTerminee = false;
            while (true) {
                while (index < buffer.length) {
                    const courant = buffer[index++];
                    if (dansChaine) {
                        if (echappe) echappe = false;
                        else if (courant === "\\") echappe = true;
                        else if (courant === '"') dansChaine = false;
                    } else if (courant === '"') {
                        dansChaine = true;
                    } else if (courant === "{" || courant === "[") {
                        profondeur++;
                    } else if (courant === "}" || courant === "]") {
                        profondeur--;
                        if (profondeur === 0) {
                            valeurTerminee = true;
                            break;
                        }
                    }
                }
                if (valeurTerminee) break;
                if (termine) throw new Error("JSON tronqué dans un objet ou un tableau.");
                await remplir();
            }
        } else if (premier === '"') {
            index++;
            let echappe = false;
            while (true) {
                let valeurTerminee = false;
                while (index < buffer.length) {
                    const courant = buffer[index++];
                    if (echappe) echappe = false;
                    else if (courant === "\\") echappe = true;
                    else if (courant === '"') {
                        valeurTerminee = true;
                        break;
                    }
                }
                if (valeurTerminee) break;
                if (termine) throw new Error("Chaîne JSON tronquée.");
                await remplir();
            }
        } else {
            while (true) {
                while (index < buffer.length && !/[\s,\]}]/.test(buffer[index])) index++;
                if (index < buffer.length || termine) break;
                await remplir();
            }
        }

        const brut = capture.parts.join("") + buffer.slice(capture.start, index);
        capture = null;
        buffer = buffer.slice(index);
        index = 0;
        return brut;
    }

    async function tableau() {
        const debut = await caractere();
        if (debut !== "[") throw new Error("Tableau JSON attendu.");
        index++;
        const elements = [];
        await espaces();
        if (await caractere() === "]") {
            index++;
            buffer = buffer.slice(index);
            index = 0;
            return elements;
        }
        while (true) {
            elements.push(JSON.parse(await valeurBrute()));
            await espaces();
            const separateur = await caractere();
            if (separateur === "]") {
                index++;
                buffer = buffer.slice(index);
                index = 0;
                return elements;
            }
            if (separateur === undefined) throw new Error("Tableau JSON tronqué.");
            if (separateur !== ",") throw new Error("Séparateur de tableau JSON invalide.");
            index++;
        }
    }

    if (await caractere() !== "{") throw new Error("Un objet JSON était attendu.");
    index++;
    const donnees = {};
    await espaces();
    if (await caractere() === "}") return donnees;

    while (true) {
        const cle = JSON.parse(await valeurBrute());
        await espaces();
        if (await caractere() !== ":") throw new Error("Séparateur de propriété JSON invalide.");
        index++;
        await espaces();
        donnees[cle] = await caractere() === "[" ? await tableau() : JSON.parse(await valeurBrute());
        await espaces();
        const separateur = await caractere();
        if (separateur === "}") {
            index++;
            await espaces();
            if (await caractere() !== undefined) throw new Error("Contenu inattendu après le JSON.");
            return donnees;
        }
        if (separateur !== ",") throw new Error("Séparateur d'objet JSON invalide.");
        index++;
    }
}

async function extraireDepuisLeSite() {
    const save = saveInput.files?.[0];
    if (!save) return;
    extractButton.disabled = true;
    saveInput.disabled = true;
    extractButton.textContent = "Extraction en cours…";
    st.innerText = `Envoi de ${save.name} puis extraction…`;
    st.style.color = "#f1c40f";
    const debutExtraction = Date.now();
    const panneau = document.getElementById("extract-progress");
    const barre = document.getElementById("extract-progress-bar");
    const etape = document.getElementById("extract-progress-stage");
    const temps = document.getElementById("extract-progress-time");
    panneau.hidden = false;
    barre.hidden = false;
    barre.value = 0;
    etape.textContent = "Envoi de la sauvegarde";
    const actualiserTemps = () => { temps.textContent = `${Math.floor((Date.now() - debutExtraction) / 1000)} s écoulées`; };
    actualiserTemps();
    const progression = setInterval(actualiserTemps, 1000);
    let suiviActif = true;
    let suiviTimer;
    const controleur = new AbortController();
    try {
        const id = crypto.randomUUID().replaceAll("-", "");
        const endpoint = new URL("/api/extract", window.location.href);
        endpoint.searchParams.set("filename", save.name);
        endpoint.searchParams.set("id", id);
        const suivreEtape = async () => {
            try {
                const url = new URL("/api/extract-status", window.location.href);
                url.searchParams.set("id", id);
                const response = await fetch(url, { cache: "no-store", signal: controleur.signal });
                if (!response.ok) throw new Error(`suivi indisponible (HTTP ${response.status})`);
                const statut = await response.json();
                if (typeof statut.etape !== "string" || !statut.etape) throw new Error("réponse de suivi invalide");
                if (suiviActif) etape.textContent = `${statut.etape} · progression exacte inconnue`;
            } catch (error) {
                if (suiviActif && error.name !== "AbortError") {
                    etape.textContent = `Extraction en cours · suivi des étapes indisponible : ${error.message}`;
                }
            }
            if (suiviActif) suiviTimer = setTimeout(suivreEtape, 1000);
        };
        const payload = await new Promise((resolve, reject) => {
            const requete = new XMLHttpRequest();
            requete.open("POST", endpoint.href);
            requete.setRequestHeader("Content-Type", "application/octet-stream");
            requete.upload.onprogress = event => {
                if (event.lengthComputable) {
                    barre.value = event.loaded / event.total * 100;
                    etape.textContent = `Envoi de la sauvegarde · ${Math.floor(event.loaded / event.total * 100)} %`;
                }
            };
            requete.upload.onload = () => {
                barre.removeAttribute("value");
                etape.textContent = "Réception de la sauvegarde et démarrage du parseur · progression exacte inconnue";
                suivreEtape();
            };
            requete.onerror = () => reject(new Error("Le service local d'extraction ne répond pas."));
            requete.onabort = () => reject(new Error("Envoi de la sauvegarde interrompu."));
            requete.onload = () => {
                let result;
                try { result = JSON.parse(requete.responseText); }
                catch (error) {
                    const type = requete.getResponseHeader("Content-Type") || "inconnu";
                    const extrait = requete.responseText.replace(/\s+/g, " ").slice(0, 160);
                    reject(new Error(
                        `Réponse du service d'extraction invalide (HTTP ${requete.status}, ${type})${extrait ? ` : ${extrait}` : "."}`
                    ));
                    return;
                }
                if (requete.status < 200 || requete.status >= 300) reject(new Error(result.error || `Échec de l'extraction (HTTP ${requete.status}).`));
                else resolve(result);
            };
            requete.send(save);
        });
        suiviActif = false;
        controleur.abort();
        clearTimeout(suiviTimer);
        barre.removeAttribute("value");
        etape.textContent = "Chargement des données extraites dans l'application";
        let dataResponse;
        let data;
        try {
            dataResponse = await fetch(`/players_data.json?t=${Date.now()}`, { cache: "no-store" });
            if (!dataResponse.ok) {
                throw new Error(`Extraction terminée, mais le fichier des données est inaccessible (HTTP ${dataResponse.status}).`);
            }
            const text = await dataResponse.text();
            console.log("[Debug] Fetched players_data.json, first 500 chars:", text.substring(0, 500));
            data = JSON.parse(text);
        } catch (error) {
            throw new Error(`Connexion au fichier des données interrompue : ${error.message || String(error)}`);
        }
        if (!dataResponse.ok) {
            throw new Error(`Extraction terminée, mais le fichier des données est inaccessible (HTTP ${dataResponse.status}).`);
        }
        if (!data || !Array.isArray(data.joueurs) || !Array.isArray(data.staff)) {
            throw new Error("Extraction terminée, mais le fichier des données des joueurs et du staff est invalide.");
        }
        afficherDonnees(data);
        st.innerText = payload.message || `Extraction terminée ! Joueurs : ${rawData.joueurs.length} | Staff : ${rawData.staff.length}`;
        st.style.color = "#2ecc71";
        barre.value = 100;
        etape.textContent = "Extraction et chargement terminés";
    } catch (error) {
        const localHelp = window.location.protocol === "file:"
            ? " Ouvrez « Lancer Assistant FM.bat » puis réessayez dans le navigateur."
            : "";
        st.innerText = `❌ ${error.message || "Le service local d'extraction ne répond pas."}${localHelp}`;
        st.style.color = "#e74c3c";
        barre.hidden = true;
        etape.textContent = "Extraction interrompue. Consultez le message d'erreur ci-dessus.";
    } finally {
        suiviActif = false;
        controleur.abort();
        clearTimeout(suiviTimer);
        clearInterval(progression);
        actualiserTemps();
        saveInput.disabled = false;
        extractButton.disabled = !saveInput.files?.length;
        extractButton.textContent = saveInput.files?.length
            ? `Extraire : ${saveInput.files[0].name}`
            : "Choisir une sauvegarde .fm";
    }
}

function changerOnglet(nouveauMode) {
    if (nouveauMode === "recrutement") nouveauMode = "joueurs";
    if (nouveauMode === "tactique") {
        clubActiveTab = "tactique";
        nouveauMode = "club";
    } else if (Object.hasOwn(vuesClub, nouveauMode)) {
        clubActiveTab = nouveauMode;
        nouveauMode = "club";
    }
    if (nouveauMode === "planificateur" || nouveauMode === "affaires") {
        document.getElementById("se").value = "";
    }
    mode = nouveauMode;
    const titres = {
        joueurs: "Recrutement", staff: "Staff technique",
        planificateur: "Planificateur d’effectif", mercato: "Copilote mercato", affaires: "Bonnes affaires", "recrutement-poste": "Recruter par poste",
        club: "Mon club", similaires: "Joueurs similaires", diagnostic: "Diagnostic",
        performances: "Performances", laboratoire: "Laboratoire tactique", optimisation: "Optimiseur tactique",
        jeunes: "Développement des jeunes", confiance: "Confiance des données", suivi: "Suivi & comparaison",
        alertes: "Alertes", journal: "Historique de partie"
    };
    document.getElementById("workspace-title").textContent = titres[mode] || "Assistant FM";
    const recrutementActif = ["joueurs", "staff", "similaires", "planificateur", "affaires", "mercato", "recrutement-poste"].includes(mode);
    const suiviActif = ["suivi", "alertes", "journal"].includes(mode);
    if (recrutementActif) derniereVueRecrutement = mode;
    if (suiviActif) derniereVueSuivi = mode;
    document.getElementById("btn-recrutement").classList.toggle("active", recrutementActif);
    document.getElementById("btn-club").classList.toggle("active", mode === "club");
    document.getElementById("btn-espace-suivi").classList.toggle("active", suiviActif);
    document.getElementById("suivi-subnav").style.display = suiviActif ? "flex" : "none";
    document.querySelectorAll("#recruitment-subnav [data-recruitment-view]").forEach(button => {
        const selected = recrutementActif && button.dataset.recruitmentView === mode;
        button.classList.toggle("active", selected);
        if (selected) {
            button.setAttribute("aria-current", "page");
            const group = button.closest("details");
            if (group) {
                document.querySelectorAll("#recruitment-subnav > details").forEach(item => { item.open = item === group; });
            }
        }
        else button.removeAttribute("aria-current");
    });
    document.querySelectorAll("#suivi-subnav [id^='btn-']").forEach(button => {
        button.classList.toggle("active", suiviActif && button.id === `btn-${mode}`);
    });
    document.querySelectorAll("#club-view [data-club-tab]").forEach(button => {
        const selected = mode === "club" && button.dataset.clubTab === clubActiveTab;
        if (selected) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    document.querySelectorAll("#club-view .club-menu").forEach(menu => {
        menu.open = false;
        menu.classList.toggle("active", mode === "club" && Boolean(menu.querySelector('[aria-current="page"]')));
    });
    document.querySelectorAll("#club-view .club-view-panel").forEach(panel => {
        panel.hidden = mode !== "club" || panel.id !== `club-overview-${clubActiveTab}`;
    });
    Object.entries(vuesClub).forEach(([tab, id]) => {
        document.getElementById(id).style.display = mode === "club" && clubActiveTab === tab ? "block" : "none";
    });
    ["similaires", "alertes", "suivi", "journal"].forEach(name => {
        const view = document.getElementById(`${name}-view`);
        if (!vuesClub[name]) view.style.display = mode === name ? "block" : "none";
    });
    document.getElementById("list-toolbar").style.display =
        ["joueurs", "staff"].includes(mode) ? "flex" : "none";
    document.getElementById("mercato-view").style.display = mode === "mercato" ? "block" : "none";
    document.getElementById("recrutement-poste-view").style.display = mode === "recrutement-poste" ? "block" : "none";
    document.getElementById("column-options").style.display = ["joueurs", "staff"].includes(mode) ? "block" : "none";
    document.getElementById("recruitment-subnav").style.display = recrutementActif ? "flex" : "none";
    document.getElementById("staff-filter").style.display = mode === "staff" ? "block" : "none";
    document.getElementById("staff-overview").style.display = mode === "staff" && !modeDecouverte ? "block" : "none";
    document.getElementById("chk-mon-club").parentElement.style.display =
        mode === "joueurs" || mode === "staff" ? "flex" : "none";
    document.getElementById("player-filters").style.display =
        mode === "joueurs" ? "block" : "none";
    document.getElementById("active-player-filters").style.display = mode === "joueurs" ? "flex" : "none";
    document.getElementById("saved-filter-controls").style.display = mode === "joueurs" ? "block" : "none";
    document.getElementById("results-table").style.display =
        ["joueurs", "staff"].includes(mode) ? "block" : "none";
    document.getElementById("tactic-view").style.display = "none";
    document.getElementById("planner-view").style.display = mode === "planificateur" ? "block" : "none";
    document.getElementById("bargains-view").style.display = mode === "affaires" ? "block" : "none";
    document.getElementById("club-view").style.display = mode === "club" ? "block" : "none";
    document.getElementById("club-view").style.flex =
        mode === "club" && Object.hasOwn(vuesClub, clubActiveTab) ? "0 0 auto" : "";
    document.getElementById("club-view").style.overflow =
        mode === "club" && Object.hasOwn(vuesClub, clubActiveTab) ? "visible" : "";
    document.getElementById("club-view").style.zIndex =
        mode === "club" && Object.hasOwn(vuesClub, clubActiveTab) ? "5" : "";
    if (mode === "club" && !document.querySelector("#club-view [data-club-tab]")) afficherMonClub();
    configEnTetes();
    if (window.location.protocol === "file:") {
        st.innerText = "Pour extraire une sauvegarde avec le bouton, ouvrez « Lancer Assistant FM.bat ».";
        st.style.color = "#f1c40f";
    }
    filtrerTout();
}

function ouvrirRecrutement() {
    changerOnglet(derniereVueRecrutement);
}

function ouvrirSuivi() {
    changerOnglet(derniereVueSuivi);
}

function definirStatutLicence(message, erreur = false) {
    // Kept for compatibility - no-op in free version
}

function ouvrirAccesPremium() {
    // Open donation link instead of license gate
    window.open("https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID", "_blank", "noopener,noreferrer");
}

function fermerAccesPremium() {
    // No-op in free version
}

// All license verification functions removed - app is now free with optional donations
// Donation button handler is set up in the event listeners section below

function configEnTetes() {
    const headerConfig = mode === "staff"
        ? { headers: [["nom", "Nom"], ["nationalite", "Nationalité"], ["metier", "Métier"], ["age", "Âge"], ["ca", "CA"], ["pa", "PA"], ["ligue", "Ligue"], ["salaire_hebdomadaire", "Salaire actuel"], ["club", "Club"]], widths: [17, 11, 18, 6, 6, 6, 10, 10, 16] }
        : mode === "joueurs"
            ? { headers: [["nom", "Nom"], ["poste", "Poste"], ["nationalite", "Nationalité"], ["ligue", "Ligue"], ["club", "Club"], ["age", "Âge"], ["taille_cm", "Taille"], ["pied_fort", "Pied"], ["salaire_hebdomadaire", "Salaire actuel"], ["ca", "CA"], ["pa", "PA"], ["reputation", "Réputation"], ["cout_estime", "Frais estimés"], ["role_recrutement", "Compatibilité"]], widths: [13, 6, 9, 10, 13, 4, 5, 6, 8, 4, 4, 5, 7, 6] }
            : { headers: [], widths: [] };
    const row = document.getElementById("th-dynamique");
    const table = row.closest("table");
    const oldColgroup = table.querySelector("colgroup");
    if (oldColgroup) oldColgroup.remove();
    const colgroup = document.createElement("colgroup");
    headerConfig.widths.forEach(width => {
        const col = document.createElement("col");
        col.style.width = `${width}%`;
        colgroup.appendChild(col);
    });
    table.prepend(colgroup);
    row.replaceChildren();
    headerConfig.headers.forEach(([property, label]) => {
        const th = document.createElement("th");
        th.textContent = label;
        if (property) {
            th.addEventListener("click", () => trier(property));
        }
        row.appendChild(th);
    });
    const emptyCell = tbody.querySelector("td");
    if (emptyCell && !rawData.joueurs.length && !rawData.staff.length) {
        emptyCell.colSpan = headerConfig.headers.length;
    }
    if (typeof actualiserColonnes === "function") actualiserColonnes(headerConfig.headers);
}

function trier(property) {
    asc = sortProp === property ? !asc : true;
    sortProp = property;
    listAct.sort((a, b) => {
        const valeur = person => property === "role_recrutement" ? person.role_recrutement?.score
            : property === "nationalite" ? nomNation(person)
                : property === "ligue" ? liguePersonne(person)
                    : person[property];
        const left = valeur(a);
        const right = valeur(b);
        if (property === "poste") {
            const positionOrder = comparerPostes(left, right);
            return asc ? positionOrder : -positionOrder;
        }
        if (typeof left === "number" && typeof right === "number") {
            return asc ? left - right : right - left;
        }
        const comparison = String(left ?? "").localeCompare(String(right ?? ""), "fr");
        return asc ? comparison : -comparison;
    });
    render(false);
}

function comparerPostes(left, right) {
    const rang = value => {
        const label = String(value ?? "").split(/\s*\/\s*/)[0].trim();
        const code = label.match(/\(([A-Z]{2,3})\)/)?.[1] || label.toUpperCase();
        const key = codePosteNom[code]
            || clePoste[label.toLocaleLowerCase("fr")]
            || codePosteNom[label.toUpperCase()]
            || Object.keys(postes).find(position => postes[position].replace(/\s*\([^)]+\)$/, "").toLocaleLowerCase("fr") === label.toLocaleLowerCase("fr"));
        return rangPosteTerrain.get(key) ?? Number.MAX_SAFE_INTEGER;
    };
    const difference = rang(left) - rang(right);
    return difference || String(left ?? "").localeCompare(String(right ?? ""), "fr");
}

function comparerEffectif(a, b) {
    const direction = clubRosterAscending ? 1 : -1;
    if (clubRosterSort === "poste") {
        return direction * comparerPostes(afficherPoste(a), afficherPoste(b))
            || String(a.nom || "").localeCompare(String(b.nom || ""), "fr");
    }
    if (clubRosterSort === "nom") {
        return direction * String(a.nom || "").localeCompare(String(b.nom || ""), "fr");
    }
    const left = a[clubRosterSort], right = b[clubRosterSort];
    const leftKnown = estNombre(left), rightKnown = estNombre(right);
    if (leftKnown !== rightKnown) return leftKnown ? -1 : 1;
    const difference = leftKnown ? Number(left) - Number(right) : 0;
    return direction * difference || String(a.nom || "").localeCompare(String(b.nom || ""), "fr");
}

function clsNote(value) {
    if (value == null || !Number.isFinite(Number(value))) return "note";
    if (value >= 150) return "note elite";
    if (value >= 130) return "note excellent";
    if (value >= 110) return "note moyen";
    return "note faible";
}

function filtrerTout() {
    if (mode === "recrutement-poste") { afficherRecrutementPoste(); return; }
    if (mode === "mercato") { afficherMercato(); return; }
    if (mode === "journal") { afficherJournal(); return; }
    if (mode === "similaires") { afficherSimilaires(); return; }
    if (mode === "alertes") { afficherAlertes(); return; }
    if (mode === "suivi") { afficherSuivi(); return; }
    if (mode === "planificateur") {
        afficherPlanSportif();
        return;
    }
    if (mode === "affaires") {
        afficherBonnesAffaires();
        return;
    }
    if (mode === "club") {
        const renderers = {
            effectif: afficherMonClub,
            tactique: afficherMonClub,
            transferts: afficherMonClub,
            overview: afficherMonClub,
            diagnostic: afficherDiagnostic,
            performances: afficherPerformances,
            laboratoire: afficherLaboratoire,
            optimisation: afficherOptimisationTactique,
            jeunes: afficherJeunes,
            confiance: afficherConfiance
        };
        (renderers[clubActiveTab] || afficherMonClub)();
        return;
    }
    const query = document.getElementById("se").value.trim().toLocaleLowerCase("fr");
    const monClub = document.getElementById("chk-mon-club").checked;
    const source = mode === "staff" ? rawData.staff : rawData.joueurs;
    const filtresAttributs = mode === "staff" ? { criteres: [], erreur: "" } : lireFiltresAttributs();
    const statusFiltres = document.getElementById("player-filter-status");
    const minValeur = document.getElementById("valeur-min");
    const maxValeur = document.getElementById("valeur-max");
    const erreurValeur = !minValeur.checkValidity() || !maxValeur.checkValidity()
        || (minValeur.value !== "" && maxValeur.value !== "" && Number(minValeur.value) > Number(maxValeur.value));
    const erreurBudget = ["cout-max", "salaire-min", "salaire-max"].some(id => {
        const control = document.getElementById(id);
        return !control.checkValidity() || (control.value !== "" && !Number.isSafeInteger(Number(control.value)));
    });
    const salaireMin = document.getElementById("salaire-min").value;
    const salaireMax = document.getElementById("salaire-max").value;
    const erreurSalaire = salaireMin !== "" && salaireMax !== "" && Number(salaireMin) > Number(salaireMax);
    const erreurFiltres = filtresAttributs.erreur || (erreurValeur ? "Vérifiez les bornes de valeur marchande." : "")
        || (erreurBudget ? "Vérifiez les limites de coût et de salaire." : "")
        || (erreurSalaire ? "Vérifiez les bornes de salaire." : "");
    const margeReputation = Number(document.getElementById("marge-reputation").value);
    const reputationClub = estNombre(rawData.club_gere?.reputation) ? Number(rawData.club_gere.reputation) : null;
    const erreurReputation = mode === "joueurs" && !Number.isFinite(margeReputation);
    const erreurFiltresRecrutement = erreurReputation ? "Vérifiez l’écart de réputation maximum." : "";
    // Filtre genre : automatique selon le club géré (si connu)
    const effectiveGender = rawData.club_gere_gender;
    const clubGenderMap = new Map();
    if (rawData.clubs) {
        rawData.clubs.forEach(club => {
            if (club.gender !== undefined && club.gender !== null) {
                clubGenderMap.set(club.uid, club.gender);
            }
        });
    }
    listAct = source.filter(person => {
        if (mode !== "staff" && (erreurFiltres || !correspondAuxFiltresJoueur(person, filtresAttributs.criteres))) return false;
        if (erreurFiltresRecrutement) return false;
        if (mode === "joueurs" && person.est_mon_club !== true
            && reputationClub !== null && estNombre(person.reputation)
            && Number(person.reputation) > reputationClub + margeReputation) return false;
        if (mode !== "staff" && monClub && person.est_mon_club !== true) {
            return false;
        }
        // Filtre genre : seulement si effectiveGender est défini (0 ou 1)
        if (mode === "joueurs" && effectiveGender !== null && effectiveGender !== undefined) {
            const clubGender = clubGenderMap.get(person.club_uid);
            if (clubGender !== effectiveGender) return false;
        }
        if (mode === "staff") {
            const metier = document.getElementById("staff-job-filter").value;
            if (metier && person.metier !== metier) return false;
        }
        if (!query) return true;
        const found = [
            person.nom,
            mode === "staff" ? traduireMetier(person.metier) : afficherPoste(person),
            person.club,
            nomNation(person),
            liguePersonne(person)
        ]
            .some(value => String(value ?? "").toLocaleLowerCase("fr").includes(query));
        return found || (mode === "joueurs"
            && String(resumeRecrutement(person)?.label ?? "").toLocaleLowerCase("fr").includes(query));
    }).map(person => mode === "joueurs"
        ? { ...person, role_recrutement: resumeRecrutement(person), cout_estime: coutEstime(person) }
        : person);
    statusFiltres.classList.toggle("error", Boolean(erreurFiltres || erreurFiltresRecrutement));
    statusFiltres.textContent = erreurFiltres || erreurFiltresRecrutement || `${listAct.length.toLocaleString("fr-FR")} profil(s) correspondant(s).`;
    if (mode === "joueurs") actualiserFiltresActifs(listAct.length);
    maxRow = 100;
    render(false);
}

function actualiserFiltresActifs(nombre) {
    const target = document.getElementById("active-player-filters");
    const controls = [...document.querySelectorAll("#player-filters .player-filter input, #player-filters .player-filter select")];
    const actifs = controls.filter(control => control.id !== "marge-reputation"
        && (control.type === "checkbox" ? control.checked : control.value !== ""))
        .map(control => ({
            id: control.id,
            label: `${(control.type === "checkbox"
                ? control.closest("label").textContent
                : control.closest("label").childNodes[0].textContent).trim().replace(/\s+/g, " ")} : ${
                control.type === "checkbox" ? "Oui" : control.selectedOptions?.[0]?.textContent || control.value
            }`
        }));
    const marge = document.getElementById("marge-reputation").value;
    if (marge !== "1000") actifs.push({ id: "marge-reputation", label: `Réputation : +${marge} (retour au défaut +1000)` });
    const recherche = document.getElementById("se").value.trim();
    if (recherche) actifs.push({ id: "se", label: `Recherche : ${recherche}` });
    if (document.getElementById("chk-mon-club").checked) actifs.push({ id: "chk-mon-club", label: "Mon effectif" });
    document.querySelectorAll("#attribute-filter-rows .attribute-filter-row").forEach((row, index) => {
        const select = row.querySelector("select"), inputs = row.querySelectorAll("input");
        if (select?.value && (inputs[0].value || inputs[1].value)) actifs.push({
            id: `attribut:${index}`, label: `${select.selectedOptions[0].textContent} : ${inputs[0].value || "—"} à ${inputs[1].value || "—"}`
        });
    });
    target.innerHTML = `<span>Filtres actifs · réputation max. +${escapeHtml(marge)}${marge === "1000" ? " (défaut)" : ""} :</span> ${actifs.map(item =>
        `<button type="button" class="tab-btn" data-active-filter="${escapeHtml(item.id)}" aria-label="Retirer ${escapeHtml(item.label)}">${escapeHtml(item.label)} ×</button>`
    ).join(" ")} <button type="button" class="tab-btn" data-clear-all-filters>Réinitialiser</button>${nombre ? "" : '<p>Aucun résultat : retirez un critère ou réinitialisez les filtres.</p>'}`;
}

function formatMoney(value) {
    if (value == null || value === "") return "non renseigné";
    const amount = Number(value);
    return Number.isFinite(amount)
        ? new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0
        }).format(amount)
        : "non renseigné";
}

function lienProfil(kind, id, label, name = "", copyName = false) {
    if (id == null && !name) return escapeHtml(label);
    const attributes = [
        `data-profile-kind="${escapeHtml(kind)}"`,
        id == null ? "" : `data-profile-id="${escapeHtml(id)}"`,
        name ? `data-profile-name="${escapeHtml(name)}"` : "",
        copyName ? 'data-profile-copy-name="true"' : ""
    ].filter(Boolean).join(" ");
    const extraClass = kind === "club" ? " club-profile-link" : "";
    return `<button type="button" class="profile-link${extraClass}" ${attributes}>${escapeHtml(label)}</button>`;
}

function linkJoueur(player) {
    return `<span class="person-link">${portraitHtml(player)}${lienProfil("joueur", player?.uid, player?.nom || "Joueur")}</span>`;
}

function linkStaff(member) {
    return `<span class="person-link">${portraitHtml(member)}${lienProfil("staff", member?.uid, member?.nom || "Membre du staff")}</span>`;
}

function portraitHtml(person, size = "") {
    const id = String(person?.portrait_id ?? "");
    const image = /^(?:r-)?\d+$/.test(id)
        ? `<img src="/api/face/${id}" alt="" loading="${size ? "eager" : "lazy"}" onerror="this.remove()">`
        : "";
    return `<span class="person-avatar${size ? ` ${size}` : ""}" aria-hidden="true"><span>${escapeHtml(initialesVisuelles(person?.nom))}</span>${image}</span>`;
}

function linkClub(name, id = null) {
    const label = String(name || "").trim();
    if (!label || label === "—") return escapeHtml(label || "—");
    if (label.toLocaleLowerCase("fr") === "sans club") return escapeHtml(label);
    const match = (id != null ? clubIndexById.get(String(id)) : null) || clubIndexByName.get(label);
    const clubId = id ?? match?.uid ?? (label === rawData.club_gere?.name ? rawData.club_gere?.uid : null);
    return lienProfil("club", clubId, label, label);
}

function cleCompetition(standing) {
    if (standing?.competition_id != null) return `local:${standing.competition_id}`;
    if (standing?.competition_uid != null) return `base:${standing.competition_uid}`;
    return "";
}

function linkCompetition(standing, club = {}, label = "") {
    const name = label || nomCompetition(standing, club) || "Compétition non disponible";
    const key = cleCompetition(standing);
    return key ? lienProfil("competition", key, name) : escapeHtml(name);
}

function ouvrirProfil(kind, id, name, position = "", role = "") {
    if (kind === "competition") {
        const standing = (rawData.clubs || []).flatMap(club => club.classements || [])
            .find(item => cleCompetition(item) === String(id));
        if (!standing) {
            st.innerText = "Compétition introuvable dans les classements chargés.";
            st.style.color = "#e74c3c";
            return;
        }
        entSel = { ...standing };
        entSelMode = "competition";
        competitionActiveTab = "classement";
        pop();
        return;
    }
    if (kind === "club") {
        const clubName = name || rawData.club_gere?.name || "";
        const clubData = (id != null ? clubIndexById.get(String(id)) : null) || clubIndexByName.get(clubName);
        entSel = {
            ...(clubData || (clubName === rawData.club_gere?.name ? rawData.club_gere : {})),
            name: clubName,
            uid: id ?? clubData?.uid ?? (clubName === rawData.club_gere?.name ? rawData.club_gere.uid : null)
        };
        entSelMode = "club";
        pop();
        return;
    }
    const collection = kind === "staff" ? rawData.staff : rawData.joueurs;
    const selected = collection.find(person => String(person.uid) === String(id));
    if (!selected) return;
    entSel = selected;
    entSelMode = kind === "staff" ? "staff" : "joueurs";
    profileActiveTab = "profile";
    profileComparisonPlayerIndex = null;
    if (entSelMode === "joueurs") {
        profileAttributeTab = "field";
        profilePosition = joueurAuPoste(selected, position) ? position : "";
        profileRole = (rolesParPoste[profilePosition] || []).includes(role) ? role : "";
    }
    pop();
}

function valeurBudgetTransfert() {
    const budget = rawData.cadre_financier?.budget_transfert;
    if (budget == null || budget === "") return "";
    const value = Number(budget);
    return Number.isFinite(value) && value >= 0 ? String(value) : "";
}

function budgetTransfert() {
    const value = Number(valeurBudgetTransfert());
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function clauseSortie(player) {
    const kinds = ["minimum_fee_release", "minimum_fee_release_domestic", "minimum_fee_release_foreign",
        "minimum_fee_release_domestic_higher_division"];
    return (player.clauses || [])
        .filter(clause => kinds.some(kind => clause.kind === kind)
            && Number.isFinite(Number(clause.value))
            && Number(clause.value) > 0)
        .sort((a, b) => Number(a.value) - Number(b.value))[0] || null;
}

function coutEstime(player, multipleOffre = multipleOffreDefaut) {
    if (player.sous_contrat === false) return 0;
    const releaseClause = clauseSortie(player);
    if (releaseClause) return Number(releaseClause.value);
    const marketValue = Number(player.valeur_marchande);
    const multiple = Number(multipleOffre) || multipleOffreDefaut;
    return Number.isFinite(marketValue) && marketValue > 0 ? marketValue * multiple : null;
}

function estAbordable(player) {
    const cost = coutEstime(player);
    return cost != null && cost <= budgetTransfert();
}

function dateJeuUtc(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function joueursAuPoste(position) {
    return rawData.joueurs.filter(player => player.est_mon_club === true && joueurAuPoste(player, position));
}

function joueursRecommandesPourPoste(position, role, count = 3, includeDepth = false) {
    const currentPlayers = joueursAuPoste(position);
    const currentRatings = currentPlayers
        .map(player => ({ player, score: noteRole(player, role, position) }))
        .filter(result => Number.isFinite(result.score))
        .sort((a, b) => b.score - a.score);
    const bestCurrent = currentRatings[0] || null;
    const bestYouth = currentPlayers
        .filter(player => Number(player.age) < 20 && estNombre(player.pa))
        .reduce((best, player) => !best || Number(player.pa) > Number(best.pa) ? player : best, null);
    const clubReputation = estNombre(rawData.club_gere?.reputation) ? Number(rawData.club_gere.reputation) : null;
    const margin = Number(document.getElementById("marge-reputation").value) || 0;
    const candidates = rawData.joueurs
        .filter(player => player.est_mon_club !== true
            && joueurAuPoste(player, position)
            && estAbordable(player)
            && (!estNombre(player.reputation) || clubReputation === null
                || Number(player.reputation) <= clubReputation + margin))
        .map(player => {
            const score = noteRole(player, role, position);
            const surpassesFirst = bestCurrent !== null && score > bestCurrent.score;
            const beatsYouthPotential = Number(player.age) < 20
                && estNombre(player.pa)
                && bestYouth !== null
                && Number(player.pa) > Number(bestYouth.pa);
            return {
                player,
                score,
                reason: surpassesFirst
                    ? "niveau estimé supérieur au meilleur actuel"
                    : beatsYouthPotential
                        ? `PA supérieur au meilleur U20 actuel (${player.pa} > ${bestYouth.pa})`
                        : includeDepth ? "profil de profondeur admissible" : ""
            };
        })
        .filter(result => result.reason && Number.isFinite(result.score))
        .sort((a, b) => b.score - a.score || Number(b.player.pa || 0) - Number(a.player.pa || 0))
        .slice(0, count);
    return { currentRatings, bestYouth, candidates };
}

function carteJoueur(player, detail = "", includeCost = true) {
    const cost = coutEstime(player);
    const feeLabel = !includeCost
        ? ""
        : player.sous_contrat === false
            ? "Libre"
            : clauseSortie(player)
                ? `Clause exportée : ${formatMoney(cost)}`
                : `Coût estimé : ${formatMoney(cost)}`;
    const roleLabel = meilleurRole(player).label || afficherPoste(player);
    const feeLine = feeLabel ? `<br>${escapeHtml(feeLabel)}` : "";
    return `<div class="dashboard-item"><strong>${linkJoueur(player)}</strong> · ${escapeHtml(roleLabel)} · CA ${escapeHtml(player.ca ?? "—")} / PA ${escapeHtml(player.pa ?? "—")}${feeLine}${detail ? `<br>${escapeHtml(detail)}` : ""}</div>`;
}

function afficherPlanificateur() {
    const target = document.getElementById("planner-view");
    const tactic = rawData.tactiques.find(item => item.id === document.getElementById("tactique-select").value);
    if (!tactic) {
        target.innerHTML = "<h2>Planificateur d’effectif</h2><p>Sélectionnez d’abord une tactique dans « Mon club » &gt; « Tactique ».</p>";
        return;
    }
    let html = `<h2>Planificateur · ${escapeHtml(tactic.nom)}</h2><p>Une lacune est estimée lorsqu’il y a moins de deux joueurs de l’effectif capables d’occuper le poste. Les frais sont approximatifs et le fait qu’un joueur accepte de venir ne peut pas être vérifié.</p>`;
    const roleSelections = tacticalRoles[tactic.id] || {};
    (tactic.postes || []).forEach(slot => {
        const positions = slot.avec_ball?.length ? slot.avec_ball : slot.sans_ball || [];
        const position = clePoste[positions[0]] || positions[0];
        if (!position) return;
        const choices = rolesParPoste[position] || Object.keys(roles);
        const role = roles[roleSelections[slot.numero] || choices[0]] || roles[choices[0]];
        const squad = joueursAuPoste(position);
        const selected = rawData.selections.find(selection =>
            String(selection.team_id) === String(tactic.team_id)
            && Number(selection.slot) === Number(slot.numero)
            && !selection.remplacant
        );
        const gap = squad.length < 2;
        const recommendations = joueursRecommandesPourPoste(position, role, 3, gap);
        const candidates = recommendations.candidates.length
            ? recommendations.candidates.map(item => carteJoueur(
                item.player,
                `${item.score.toFixed(1)}/20 · ${item.reason}`
            )).join("")
            : "<div class=\"dashboard-item\">Aucun candidat estimé dans le budget et les critères actuels.</div>";
        const bestPlayer = recommendations.currentRatings[0]?.player;
        const bestYouth = recommendations.bestYouth;
        const selectedPlayer = selected
            ? rawData.joueurs.find(player => String(player.uid) === String(selected.joueur_uid))
            : null;
        html += `<div class="dashboard-card"><h3>${escapeHtml(nomPoste(position))} · ${escapeHtml(role.nom)}${gap ? " · Lacune estimée" : ""}</h3><div>Effectif : ${squad.length} joueur(s) éligible(s)${selectedPlayer ? ` · titulaire enregistré : ${linkJoueur(selectedPlayer)}` : ""}</div><div>Meilleur CA/poste : ${bestPlayer ? linkJoueur(bestPlayer) : "non disponible"}</div><div>Meilleur PA U20 : ${bestYouth ? `${linkJoueur(bestYouth)} (${escapeHtml(bestYouth.pa)})` : "non disponible"}</div><div style="margin-top:8px">${candidates}</div></div>`;
    });
    target.innerHTML = html;
}

function renderJoueursListe(players, detailFn = () => "", includeCost = true) {
    if (!players.length) return "<div class=\"dashboard-item\">Aucun profil trouvé dans les données exportées.</div>";
    return players.slice(0, 8).map(player => carteJoueur(player, detailFn(player), includeCost)).join("");
}

function afficherBonnesAffaires() {
    const target = document.getElementById("bargains-view");
    const gameDate = dateJeuUtc(rawData.date_sauvegarde);
    const expiryLimit = gameDate ? new Date(gameDate.getTime() + 365 * 86400000) : null;
    const players = rawData.joueurs.filter(player => player.est_mon_club !== true);
    const free = players.filter(player => player.sous_contrat === false)
        .sort((a, b) => Number(b.ca || 0) - Number(a.ca || 0));
    const expiring = players.filter(player => {
        const end = dateJeuUtc(player.fin_contrat);
        return player.sous_contrat === true && gameDate && expiryLimit && end
            && end >= gameDate && end <= expiryLimit;
    }).sort((a, b) => String(a.fin_contrat).localeCompare(String(b.fin_contrat)));
    const clauses = players.filter(player => clauseSortie(player) && estAbordable(player))
        .sort((a, b) => Number(clauseSortie(a).value) - Number(clauseSortie(b).value));
    const surplus = rawData.joueurs.filter(player =>
        player.est_mon_club !== true
        && player.statut_effectif === "surplus_to_requirements"
        && estAbordable(player)
    ).sort((a, b) => Number(b.ca || 0) - Number(a.ca || 0));
    const young = players.filter(player => Number(player.age) <= 21
        && Number.isFinite(Number(player.ca))
        && Number.isFinite(Number(player.pa))
        && Number(player.pa) - Number(player.ca) >= 25)
        .sort((a, b) => Number(b.pa) - Number(a.pa));
    const clauseDetail = player => `Clause de sortie : ${formatMoney(clauseSortie(player)?.value)} (conditions d’application à vérifier)`;
    target.innerHTML = `<h2>Bonnes affaires · données du ${escapeHtml(rawData.date_sauvegarde || "date de jeu inconnue")}</h2><p>Les listes utilisent les contrats et clauses exportés. Les joueurs en surplus ne sont pas nécessairement inscrits sur la liste des transferts; les clauses et leur applicabilité doivent être vérifiées dans le jeu.</p><div class="dashboard-grid"><div class="dashboard-card"><h3>Agents libres (${free.length})</h3>${renderJoueursListe(free)}</div><div class="dashboard-card"><h3>Contrat se terminant dans les 12 mois (${expiring.length})</h3>${renderJoueursListe(expiring, player => `Fin de contrat : ${player.fin_contrat}`)}</div><div class="dashboard-card"><h3>Clauses de sortie exportées (${clauses.length})</h3>${renderJoueursListe(clauses, clauseDetail)}</div><div class="dashboard-card"><h3>En surplus d’effectif, coût estimé dans le budget (${surplus.length})</h3>${renderJoueursListe(surplus, player => `${traduireStatutEffectif(player.statut_effectif)} · ${formatMoney(coutEstime(player))}`)}</div><div class="dashboard-card"><h3>Jeunes à potentiel élevé (${young.length})</h3>${renderJoueursListe(young, player => `Écart PA–CA : ${Number(player.pa) - Number(player.ca)}`)}</div></div>`;
}

function afficherEvaluationStaff() {
    const target = document.getElementById("staff-overview");
    const ownStaff = rawData.staff.filter(member => member.est_mon_club === true);
    const jobs = [...new Set(rawData.staff.map(member => member.metier).filter(estMetierBackroom))];
    const evaluations = jobs.map(job => {
        const jobStaff = rawData.staff.filter(member => member.metier === job);
        const currentBest = ownStaff
            .filter(member => member.metier === job)
            .reduce((best, member) => !best || Number(member.ca || 0) > Number(best.ca || 0) ? member : best, null);
        const globalBest = jobStaff
            .reduce((best, member) => !best || Number(member.ca || 0) > Number(best.ca || 0) ? member : best, null);
        const bestExternal = jobStaff
            .filter(member => member.est_mon_club !== true)
            .reduce((best, member) => !best || Number(member.ca || 0) > Number(best.ca || 0) ? member : best, null);
        return {
            job,
            currentBest,
            globalBest,
            bestExternal,
            gap: Number(globalBest?.ca || 0) - Number(currentBest?.ca || 0)
        };
    });
    const recommendations = evaluations
        .sort((a, b) => Number(Boolean(a.currentBest)) - Number(Boolean(b.currentBest))
            || Number(b.bestExternal?.ca || 0) - Number(a.bestExternal?.ca || 0));
    const weaknesses = evaluations
        .filter(item => item.currentBest && item.globalBest && item.gap >= 15)
        .sort((a, b) => b.gap - a.gap);
    const renderRecommendation = item => `<div class="dashboard-item"><strong>${escapeHtml(traduireMetier(item.job))}</strong> · ${item.bestExternal ? `profil externe de référence : ${linkStaff(item.bestExternal)} CA ${escapeHtml(item.bestExternal.ca ?? "—")}` : "aucun profil externe disponible"} · ${item.currentBest ? `effectif actuel : ${linkStaff(item.currentBest)} CA ${escapeHtml(item.currentBest.ca ?? "—")}` : "métier non couvert"}</div>`;
    const renderWeakness = item => `<div class="dashboard-item"><strong>${escapeHtml(traduireMetier(item.job))}</strong> · ${linkStaff(item.currentBest)} CA ${escapeHtml(item.currentBest.ca ?? "—")} vs ${linkStaff(item.globalBest)} CA ${escapeHtml(item.globalBest.ca ?? "—")}</div>`;
    target.innerHTML = `<h3>Recommandations et évaluation du staff</h3>
        <div class="staff-overview-tabs" role="tablist" aria-label="Recommandations et évaluation du staff">
            <button type="button" class="tab-btn${staffOverviewTab === "recommendations" ? " active" : ""}" role="tab" aria-selected="${staffOverviewTab === "recommendations"}" aria-controls="staff-overview-recommendations" data-staff-overview-tab="recommendations">Recommandations</button>
            <button type="button" class="tab-btn${staffOverviewTab === "evaluation" ? " active" : ""}" role="tab" aria-selected="${staffOverviewTab === "evaluation"}" aria-controls="staff-overview-evaluation" data-staff-overview-tab="evaluation">Évaluation</button>
        </div>
        <section class="staff-overview-panel" id="staff-overview-recommendations" role="tabpanel"${staffOverviewTab === "recommendations" ? "" : " hidden"}>
            <div class="dashboard-card"><h3>Profils externes de référence par métier</h3>${recommendations.length ? recommendations.map(renderRecommendation).join("") : "<div class=\"dashboard-item\">Aucun métier de backroom identifié dans l’export.</div>"}</div>
            <p class="caveat">Les profils externes sont des références, pas des candidats dont l’acceptation est connue.</p>
        </section>
        <section class="staff-overview-panel" id="staff-overview-evaluation" role="tabpanel"${staffOverviewTab === "evaluation" ? "" : " hidden"}>
            <div class="dashboard-card"><h3>Écarts de CA à examiner</h3>${weaknesses.length ? weaknesses.map(renderWeakness).join("") : "<div class=\"dashboard-item\">Aucun écart de 15 points ou plus par métier détecté.</div>"}</div>
            <p class="caveat">Évaluation indicative basée uniquement sur le CA global par métier. Les attributs spécifiques aux entraîneurs/recruteurs et les étoiles d’entraînement ne sont pas disponibles dans cet export; les préférences et l’adaptabilité ne sont pas assimilées à ces compétences.</p>
        </section>`;
    target.querySelectorAll("[data-staff-overview-tab]").forEach(button => button.addEventListener("click", () => {
        staffOverviewTab = button.dataset.staffOverviewTab;
        target.querySelectorAll("[data-staff-overview-tab]").forEach(tab => {
            const active = tab.dataset.staffOverviewTab === staffOverviewTab;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        target.querySelectorAll(".staff-overview-panel").forEach(panel => {
            panel.hidden = panel.id !== `staff-overview-${staffOverviewTab}`;
        });
    }));
}

function estMetierBackroom(job) {
    const normalized = String(job || "").trim().toLocaleLowerCase("fr");
    return Boolean(normalized)
        && !["unknown", "fonction non renseignée", "chairperson", "director", "managing director"]
            .includes(normalized);
}

function traduireStatutEffectif(status) {
    const normalized = String(status || "").trim().toLocaleLowerCase("fr").replace(/[\s-]+/g, "_");
    if (!normalized) return "Non renseigné";
    if (normalized === "sans_contrat" || normalized === "unattached") return "Sans contrat";
    return statutsEffectifFrancais[normalized] || "Autre statut d’effectif";
}

function positionTactique(rawPosition) {
    const raw = String(rawPosition || "").trim();
    const normalized = raw.toLocaleLowerCase("fr");
    if (!normalized || normalized === "unknown") return "";
    return clePoste[normalized] || codePosteNom[raw.toUpperCase()] || "";
}

function groupesTactiques(tactic, perspective = "avec") {
    const groups = new Map();
    const selectedRoles = tacticalRoles[tactic.id] || (tacticalRoles[tactic.id] = {});
    const positionFixes = tacticPositionFixes[tactic.id] || {};
    (tactic.postes || []).forEach(slot => {
        const slotFix = positionFixes[slot.numero];
        const preferred = perspective === "sans" ? slot.sans_ball : slot.avec_ball;
        const fallback = perspective === "sans" ? slot.avec_ball : slot.sans_ball;
        let position = "";
        const preferredRaw = preferred?.[0];
        const preferredPos = preferredRaw && preferredRaw.toLowerCase() !== "unknown" ? positionTactique(preferredRaw) : "";
        // Correction manuelle prioritaire sur les données brutes
        if (slotFix && slotFix[perspective]) {
            position = slotFix[perspective];
        } else if (preferredPos) {
            position = preferredPos;
        }
        if (!position) {
            const fallbackRaw = fallback?.[0];
            if (fallbackRaw && fallbackRaw.toLowerCase() !== "unknown") {
                position = positionTactique(fallbackRaw);
            }
        }
        if (!position) {
            position = slot.numero != null && slot.numero <= 4 ? "dc" : slot.numero != null && slot.numero <= 7 ? "mc" : "stc";
        }
        if (!position) return;
        const rawSecondaryPosition = perspective === "combine" ? slot.sans_ball?.[0] : null;
        const secondaryPosition = positionTactique(rawSecondaryPosition);
        const choices = rolesParPoste[position] || [];
        const roleId = choices.includes(selectedRoles[slot.numero])
            ? selectedRoles[slot.numero]
            : choices[0];
        if (!groups.has(position)) {
            groups.set(position, { position, slots: [], roleIds: [], secondaryPositions: [], players: [] });
        }
        const group = groups.get(position);
        group.slots.push({ ...slot, position, roleId, secondaryPosition, players: [] });
        if (secondaryPosition && secondaryPosition !== position
            && !group.secondaryPositions.includes(secondaryPosition)) {
            group.secondaryPositions.push(secondaryPosition);
        }
        if (roleId && !group.roleIds.includes(roleId)) group.roleIds.push(roleId);
    });
    return groups;
}

function meilleurRolePourJoueur(player, position, roleIds) {
    return roleIds
        .filter(roleId => roles[roleId])
        .map(roleId => ({
            roleId,
            score: noteRole(player, roles[roleId], position)
        }))
        .filter(item => Number.isFinite(item.score))
        .sort((a, b) => b.score - a.score)[0] || null;
}

function coordonneesPoste(position, slotIndex = 0, slotCount = 1) {
    const [baseX, y] = ({
        stc: [50, 0], btg: [38, 0], btd: [62, 0],
        aml: [10, 1], amc: [50, 1], amr: [90, 1],
        ml: [10, 2], mc: [50, 2], mcg: [38, 2], mcd: [62, 2], mr: [90, 2],
        dm: [50, 3], mdg: [38, 3], mdd: [62, 3],
        wbl: [10, 4], wbr: [90, 4],
        dl: [10, 5], dc: [50, 5], dcg: [38, 5], dcd: [62, 5], dr: [90, 5],
        sw: [50, 6], gk: [50, 7]
    })[position] || [50, 3];
    const ecart = slotCount > 1 ? Math.min(24, 80 / (slotCount - 1)) : 0;
    const x = baseX < 50 ? baseX + slotIndex * ecart
        : baseX > 50 ? baseX - (slotCount - 1 - slotIndex) * ecart
            : baseX + (slotIndex - (slotCount - 1) / 2) * ecart;
    return [x, y];
}

function placerPostesTerrain(postes) {
    const counts = new Map(), indexes = new Map();
    postes.forEach(item => counts.set(item.position, (counts.get(item.position) || 0) + 1));
    const lignes = new Map();
    const postesOrdonnes = [...postes].sort((a, b) => {
        if (a.position !== "dc" || b.position !== "dc") return 0;
        const pied = item => {
            const player = item.player || item.slot?.titulaire?.player || item.slot?.players?.[0]?.player;
            const raw = String(player?.pied_fort || player?.preferred_foot || player?.strong_foot || player?.foot || player?.pied || "").toLocaleLowerCase("fr");
            return /gauche|left/.test(raw) ? -1 : /droite|right/.test(raw) ? 1 : 0;
        };
        const leftFoot = pied(a), rightFoot = pied(b);
        return leftFoot && rightFoot ? leftFoot - rightFoot : 0;
    });
    postesOrdonnes.forEach(item => {
        const index = indexes.get(item.position) || 0;
        indexes.set(item.position, index + 1);
        const [x, y] = coordonneesPoste(item.position, index, counts.get(item.position));
        if (!lignes.has(y)) lignes.set(y, []);
        lignes.get(y).push({ ...item, x });
    });
    const colonnes = Math.max(5, ...[...lignes.values()].map(ligne => ligne.length));
    const places = [];
    [...lignes.entries()].sort((a, b) => a[0] - b[0]).forEach(([, ligne], row) => {
        ligne.sort((a, b) => a.x - b.x);
        let meilleurCout = Infinity, meilleuresColonnes = [];
        function choisirColonnes(index, debut, choix, cout) {
            if (index === ligne.length) {
                if (cout < meilleurCout) {
                    meilleurCout = cout;
                    meilleuresColonnes = [...choix];
                }
                return;
            }
            for (let col = debut; col <= colonnes - (ligne.length - index); col++) {
                const centre = 100 * (col + 0.5) / colonnes;
                choisirColonnes(index + 1, col + 1, [...choix, col], cout + (centre - ligne[index].x) ** 2);
            }
        }
        choisirColonnes(0, 0, [], 0);
        ligne.forEach((item, index) => places.push({ ...item, row: row + 1, col: meilleuresColonnes[index] + 1 }));
    });
    return { places, colonnes, lignes: lignes.size };
}

const codesTerrain = { gk: "GB", sw: "LIB", dr: "DD", dl: "DG", dc: "DC", dcg: "DCG", dcd: "DCD", dm: "MDF", mdg: "MDG", mdd: "MDD",
    mc: "MC", mcg: "MCG", mcd: "MCD", mr: "MD", ml: "MG", amr: "MOD", aml: "MOG", amc: "MOC", stc: "BT", btg: "BTG", btd: "BTD", wbr: "ALD", wbl: "ALG" };

function nomPosteTerrain(position, x) {
    if (position === "dc" && x != null) return x < 50 ? postes.dcg : x > 50 ? postes.dcd : postes.dc;
    if (position === "dm" && x != null) return x < 50 ? postes.mdg : x > 50 ? postes.mdd : postes.dm;
    if (position === "mc" && x != null) return x < 50 ? postes.mcg : x > 50 ? postes.mcd : postes.mc;
    if (position === "stc" && x != null) return x < 50 ? postes.btg : x > 50 ? postes.btd : postes.stc;
    return postes[position] || nomPoste(position);
}

function contenuPlaceTerrain(position, role, x) {
    const abreviation = role.split(/\s+/).filter(mot => !/^(de|du|des|en|et|à|la|le)$/i.test(mot))
        .map(mot => mot[0]).join("").slice(0, 4).toUpperCase();
    const positionCode = position === "dc" && x != null ? x < 50 ? "DCG" : x > 50 ? "DCD" : "DC"
        : position === "dm" && x != null ? x < 50 ? "MDG" : x > 50 ? "MDD" : "MDF"
            : position === "mc" && x != null ? x < 50 ? "MCG" : x > 50 ? "MCD" : "MC"
                : position === "stc" && x != null ? x < 50 ? "BTG" : x > 50 ? "BTD" : "BT"
                    : codesTerrain[position] || position.toUpperCase();
    return `<strong class="compact-pitch-position">${escapeHtml(positionCode)}</strong>
        <span class="compact-pitch-role">${escapeHtml(abreviation || "—")}</span>`;
}

function cadreTerrain(placement, contenu, label) {
    return `<div class="football-pitch-scroll compact-pitch-scroll"><div class="football-pitch compact-pitch" style="--pitch-columns:${placement.colonnes};--pitch-rows:${Math.max(1, placement.lignes)}" aria-label="${escapeHtml(label)}">${contenu}</div></div>`;
}

function renduTerrain(groups, type) {
    const postes = [...groups.values()].flatMap(group => group.slots.map(slot => ({ group, slot, position: group.position })));
    const placement = placerPostesTerrain(postes);
    const marks = placement.places.map(({ group, slot, row, col, x }) => {
        const role = roles[slot.roleId]?.nom || "Rôle non renseigné";
        const joueur = slot.players[0];
        const personne = type !== "recommandations" ? joueur?.player : null;
        const label = `${nomPosteTerrain(group.position, x)} · ${role} · ${type === "recommandations" ? `${slot.players.length} candidat(s)` : personne?.nom || "Non attribué"}${slot.secondaryPosition ? ` · Sans ballon : ${nomPoste(slot.secondaryPosition)}` : ""}`;
        const attributes = `class="compact-pitch-slot" data-position="${escapeHtml(group.position)}" data-slot="${escapeHtml(slot.numero)}" style="grid-row:${row};grid-column:${col}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"`;
        return personne?.uid != null
            ? `<button type="button" ${attributes} data-profile-kind="joueur" data-profile-id="${escapeHtml(personne.uid)}">${contenuPlaceTerrain(group.position, role, x)}</button>`
            : `<div ${attributes}>${contenuPlaceTerrain(group.position, role, x)}</div>`;
    }).join("");
    const details = type === "recommandations" ? `<div class="pitch-recommendation-grid">${[...groups.values()].map(group => {
        const candidates = group.slots.flatMap(slot => slot.players);
        return `<section class="dashboard-card"><h3>${escapeHtml(nomPoste(group.position))}</h3>
            <p>Meilleur comparable : ${group.comparable ? `${linkJoueur(group.comparable.player)} · ${group.comparable.score.toFixed(1)}/20 · ${escapeHtml(roles[group.comparable.roleId]?.nom || "")}` : "indisponible"}</p>
            ${candidates.map(item => `<div class="dashboard-item">${linkJoueur(item.player)} · ${escapeHtml(roles[item.roleId]?.nom || "")} · ${item.score.toFixed(1)}/20<br>${escapeHtml(item.reason)}</div>`).join("") || "<p>Aucune recommandation libre selon les critères.</p>"}</section>`;
    }).join("")}</div>` : "";
    const effectif = type === "effectif" ? `<div class="pitch-player-details"><h3>Composition indicative</h3>${placement.places.map(({ group, slot, x }) => {
        const role = roles[slot.roleId]?.nom || "Rôle non renseigné";
        const joueur = slot.players[0];
        return `<div class="pitch-player-detail"><span>${escapeHtml(codesTerrain[group.position] && group.position !== "dc" ? codesTerrain[group.position] : nomPosteTerrain(group.position, x))} · ${escapeHtml(role)}${slot.secondaryPosition ? ` · Sans ballon : ${escapeHtml(nomPoste(slot.secondaryPosition))}` : ""}</span><strong>${joueur ? `${lienProfil("joueur", joueur.player.uid, joueur.player.nom || "Joueur")} · ${joueur.score.toFixed(1)}/20` : "Non attribué"}</strong></div>`;
    }).join("")}</div>` : details;
    return `<div class="tactical-pitch-layout">${cadreTerrain(placement, marks || '<p class="pitch-empty">Aucun poste reconnu dans cette tactique.</p>', "Terrain tactique avec positions et joueurs")}${effectif}</div>`;
}

function renderClubTacticalPitch(tactic, perspective = "avec") {
    const groups = groupesTactiques(tactic, perspective);
    const clubPlayers = rawData.joueurs.filter(player => player.est_mon_club === true);
    const edges = [];
    const affectationsManuelles = tacticJoueurAffectes[tactic.id] || {};
    // Appliquer les affectations manuelles en priorité
    groups.forEach(group => {
        group.slots.forEach(slot => {
            const manuel = affectationsManuelles[slot.numero];
            if (manuel) {
                const joueur = clubPlayers.find(p => String(p.uid) === String(manuel));
                if (joueur) {
                    const score = noteRole(joueur, roles[slot.roleId], group.position) || 0;
                    edges.push({ group, slot, player: joueur, roleId: slot.roleId, score });
                }
            }
        });
    });
    groups.forEach(group => {
            group.slots.forEach(slot => {
                if (affectationsManuelles[slot.numero]) return;
                clubPlayers.filter(player => joueurAuPoste(player, group.position))
                    .forEach(player => {
                        const score = noteRole(player, roles[slot.roleId], group.position);
                        if (Number.isFinite(score)) {
                            edges.push({ group, slot, player, roleId: slot.roleId, score });
                        }
                    });
            });
    });
    edges.sort((a, b) => b.score - a.score || Number(b.player.ca || 0) - Number(a.player.ca || 0));
    const usedPlayers = new Set();
    const counts = new Map();
    edges.forEach(edge => {
            const playerId = String(edge.player.uid ?? edge.player.nom);
            const count = counts.get(edge.group.position) || 0;
            if (usedPlayers.has(playerId) || count >= 3 || edge.slot.players.length) return;
            usedPlayers.add(playerId);
            counts.set(edge.group.position, count + 1);
            edge.slot.players.push(edge);
    });
    return `<p class="profile-disclaimer">Composition indicative calculée sur les rôles choisis dans l’application ; elle ne représente pas nécessairement les titulaires ou rôles utilisés en jeu.</p>${renduTerrain(groups, "effectif")}`;
}

function construireGroupesRecommandes(tactic, perspective) {
    const groups = groupesTactiques(tactic, perspective);
    const clubPlayers = rawData.joueurs.filter(player => player.est_mon_club === true);
    const edges = [];
    groups.forEach(group => {
        const playersAtPosition = clubPlayers.filter(player => joueurAuPoste(player, group.position));
        const bestYouth = playersAtPosition
            .filter(player => player.age != null && Number(player.age) < 20
                && player.pa != null && Number.isFinite(Number(player.pa)))
            .reduce((best, player) => !best || Number(player.pa) > Number(best.pa) ? player : best, null);
        const bestByRole = new Map();
        group.roleIds.forEach(roleId => {
            bestByRole.set(roleId, playersAtPosition
                .map(player => ({ player, score: noteRole(player, roles[roleId], group.position) }))
                .filter(item => Number.isFinite(item.score))
                .sort((a, b) => b.score - a.score)[0] || null);
        });
        group.comparable = [...bestByRole.entries()]
            .filter(([, comparable]) => comparable)
            .map(([roleId, comparable]) => ({ ...comparable, roleId }))
            .sort((a, b) => b.score - a.score)[0] || null;
        rawData.joueurs.filter(player => player.est_mon_club !== true
            && player.sous_contrat === false
            && joueurAuPoste(player, group.position))
            .forEach(player => {
                const eligibleFits = group.slots.map(slot => {
                    const roleId = slot.roleId;
                    const score = noteRole(player, roles[roleId], group.position);
                    const benchmark = bestByRole.get(roleId);
                    const surpassesFirst = benchmark && score > benchmark.score;
                    const beatsYouthPotential = player.age != null
                        && Number(player.age) < 20
                        && player.pa != null
                        && Number.isFinite(Number(player.pa))
                        && bestYouth
                        && Number(player.pa) > Number(bestYouth.pa);
                    if (!Number.isFinite(score) || (!surpassesFirst && !beatsYouthPotential)) return null;
                    return {
                        slot,
                        roleId,
                        score,
                        benchmark,
                        reason: surpassesFirst
                            ? "Meilleur niveau au poste"
                            : `PA supérieur aux U20 actuels (${player.pa} > ${bestYouth.pa})`
                    };
                }).filter(Boolean).sort((a, b) => b.score - a.score);
                if (eligibleFits.length) {
                    edges.push({ group, player, fits: eligibleFits.sort((a, b) => b.score - a.score) });
                }
            });
    });
    edges.sort((a, b) => b.fits[0].score - a.fits[0].score
        || Number(b.player.pa || 0) - Number(a.player.pa || 0)
        || Number(b.player.ca || 0) - Number(a.player.ca || 0));
    const assigned = new Set();
    const perPosition = new Map();
    edges.forEach(edge => {
        const playerId = String(edge.player.uid ?? edge.player.nom);
        const count = perPosition.get(edge.group.position) || 0;
        if (assigned.has(playerId) || count >= 3) return;
        const fit = edge.fits
            .slice()
            .sort((a, b) => a.slot.players.length - b.slot.players.length || b.score - a.score)[0];
        if (!fit) return;
        assigned.add(playerId);
        perPosition.set(edge.group.position, count + 1);
        fit.slot.players.push({ ...edge, ...fit });
    });
    return groups;
}

function setTacticalPitchMode(nextMode) {
    tacticalPitchMode = nextMode;
    afficherTactiqueDetail();
    if (mode === "club" && clubActiveTab === "tactique") afficherMonClub();
}

function avertissementFinances() {
    const error = rawData.erreur_finances;
    if (!error) return "";
    return `<p class="caveat" role="alert">Les données financières de cette sauvegarde FM27 ne sont pas disponibles ; le reste de la sauvegarde reste accessible.<details><summary>Détail technique</summary><pre>${escapeHtml(error)}</pre></details></p>`;
}

function afficherMonClub() {
    const target = document.getElementById("club-view");
    const clubPlayers = rawData.joueurs.filter(player => player.est_mon_club === true);
    const clubStaff = rawData.staff.filter(member => member.est_mon_club === true);
    const finances = rawData.cadre_financier || {};
    const gameDate = dateJeuUtc(rawData.date_sauvegarde);
    const contractLimit = gameDate ? new Date(gameDate.getTime() + 183 * 86400000) : null;
    const contracts = [...clubPlayers, ...clubStaff]
        .filter(person => person.fin_contrat && dateJeuUtc(person.fin_contrat))
        .map(person => ({ ...person, endDate: dateJeuUtc(person.fin_contrat) }))
        .filter(person => gameDate && contractLimit
            && person.endDate >= gameDate && person.endDate <= contractLimit)
        .sort((a, b) => a.endDate - b.endDate);
    const tousContrats = [...clubPlayers, ...clubStaff].sort((a, b) => {
        const ad = dateJeuUtc(a.fin_contrat), bd = dateJeuUtc(b.fin_contrat);
        return (ad && bd ? ad - bd : ad ? -1 : bd ? 1 : 0) || String(a.nom || "").localeCompare(String(b.nom || ""), "fr");
    });
    const lignesContrats = tousContrats.map(person => {
        const fin = dateJeuUtc(person.fin_contrat);
        const statut = !fin ? "Date indisponible" : !gameDate ? "Échéance non calculable"
            : fin < gameDate ? "Date passée" : fin <= contractLimit ? "À six mois" : "Après six mois";
        return `<tr><td>${person.metier ? linkStaff(person) : linkJoueur(person)}</td><td>${escapeHtml(person.metier ? traduireMetier(person.metier) : afficherPoste(person))}</td><td>${escapeHtml(person.fin_contrat || "—")}</td><td>${escapeHtml(statut)}</td><td>${escapeHtml(estNombre(person.salaire_hebdomadaire) ? `${formatMoney(person.salaire_hebdomadaire)}/sem.` : "—")}</td></tr>`;
    }).join("");
    const selectedIds = new Set(rawData.selections
        .filter(selection => !selection.remplacant)
        .map(selection => String(selection.joueur_uid)));
    const loanCandidates = clubPlayers.filter(player => Number(player.age) <= 21
        && !player.en_pret
        && !selectedIds.has(String(player.uid))
        && ["youngster", "future_prospect", "breakthrough_prospect"].includes(player.statut_effectif))
        .sort((a, b) => (Number(b.pa || 0) - Number(b.ca || 0)) - (Number(a.pa || 0) - Number(a.ca || 0)));
    const setPieceAttributes = [
        ["corners", "Corners"],
        ["free_kick_taking", "Coups francs"],
        ["penalty_taking", "Penalties"]
    ];
    const setPieceCards = setPieceAttributes.map(([attribute, label]) => {
        const leaders = clubPlayers.filter(player => estNombre(player.stats?.[attribute]))
            .sort((a, b) => Number(b.stats[attribute]) - Number(a.stats[attribute]))
            .slice(0, 3);
        const entries = leaders.length
            ? leaders.map(player => `<div class="dashboard-item">${linkJoueur(player)} · ${escapeHtml(player.stats[attribute])}/20</div>`).join("")
            : "<div class=\"dashboard-item\">Aucune statistique disponible.</div>";
        return `<div class="dashboard-card club-set-piece-card"><h3>${label} · suggestions</h3>${entries}</div>`;
    }).join("");
    const loanEntries = renderJoueursListe(
        loanCandidates,
        player => `Âge ${player.age} · CA ${player.ca ?? "—"} · PA ${player.pa ?? "—"} · ${traduireStatutEffectif(player.statut_effectif)}`,
        false
    );
    const contractEntries = contracts.length
        ? contracts.slice(0, 15).map(person => `<div class="dashboard-item"><strong>${person.metier ? linkStaff(person) : linkJoueur(person)}</strong> · ${person.metier ? escapeHtml(traduireMetier(person.metier)) : escapeHtml(afficherPoste(person))} · ${escapeHtml(person.fin_contrat)} · ${formatMoney(person.salaire_hebdomadaire)}/sem.</div>`).join("")
        : "<div class=\"dashboard-item\">Aucun contrat arrivant à échéance dans les six prochains mois selon la date de jeu exportée.</div>";
    const tacticOptions = rawData.tactiques.map(tactic =>
        `<option value="${escapeHtml(tactic.id)}"${tactic.id === document.getElementById("tactique-select").value ? " selected" : ""}>${escapeHtml(tactic.nom)}${tactic.team_slot == null ? "" : ` · équipe ${Number(tactic.team_slot) + 1}`}</option>`
    ).join("");
    const tactic = rawData.tactiques.find(item => item.id === document.getElementById("tactique-select").value);
    const tacticalPhases = [
        { value: "combine", label: "Vue combinée (les deux phases)" },
        { value: "avec", label: "Avec le ballon" },
        { value: "sans", label: "Sans le ballon" }
    ];
    const tacticalPhaseOptions = tacticalPhases.map(p =>
        `<option value="${p.value}"${tacticalPitchMode === p.value ? " selected" : ""}>${escapeHtml(p.label)}</option>`
    ).join("");
    const tacticPitch = tactic
        ? renderClubTacticalPitch(tactic, tacticalPitchMode)
        : `<p class="profile-disclaimer">Choisissez une tactique pour afficher la composition et les joueurs de votre effectif.</p>`;
    const tacticDebug = tactic && tactic.postes
        ? `<details style="margin-top:16px;padding:10px;background:#0c1925;border-radius:6px;border:1px solid #2a3040"><summary style="color:#5b9bd5;cursor:pointer">Données tactiques brutes (debug avec/sans ballon)</summary><pre style="font-size:10px;margin-top:6px;overflow:auto;max-height:300px">${escapeHtml(JSON.stringify(tactic.postes, null, 2))}</pre></details>`
        : "";
    const tacticPositionEditor = tactic && tactic.postes
        ? `<div style="margin-top:16px;padding:10px;background:#0c1925;border-radius:6px;border:1px solid #2a3040"><h4 style="color:#5b9bd5;margin-top:0">Corriger les positions « Sans le ballon »</h4><p style="font-size:12px;color:#888;margin-bottom:10px">Certaines positions sans ballon sont indéterminées (unknown) dans votre sauvegarde FM27. Sélectionnez la position réelle pour chaque slot :</p><div class="tactic-position-fixes"></div><button type="button" onclick="appliquerPositionFixes('${escapeHtml(tactic.id)}')" style="background:#2ecc71;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer">Appliquer et rafraîchir le terrain</button></div>`
        : "";
    const tacticRoleControls = tactic && tactic.postes
        ? (() => {
            const groups = groupesTactiques(tactic, tacticalPitchMode);
            const selectedRoles = tacticalRoles[tactic.id] || (tacticalRoles[tactic.id] = {});
            const affectations = tacticJoueurAffectes[tactic.id] || {};
            const joueursDuClub = rawData.joueurs.filter(player => player.est_mon_club === true);
            const joueurOptions = joueursDuClub.map(j =>
                `<option value="${escapeHtml(j.uid || "")}">${escapeHtml(j.nom || "Sans nom")} · ${escapeHtml(j.age || "")} · CA ${escapeHtml(j.ca || "—")}</option>`
            ).join("");
            return [...groups.values()].flatMap(group => group.slots.map(slot => {
                const position = group.position;
                const choices = rolesParPoste[position] || [];
                const selected = selectedRoles[slot.numero] || choices[0];
                const roleOptions = choices.map(roleId =>
                    `<option value="${roleId}"${roleId === selected ? " selected" : ""}>${escapeHtml(roles[roleId].nom)}</option>`
                ).join("");
                const joueurActif = affectations[slot.numero] ? joueursDuClub.find(j => String(j.uid) === String(affectations[slot.numero])) : null;
                const joueurLabel = joueurActif ? `${escapeHtml(joueurActif.nom || "Sans nom")} · CA ${escapeHtml(joueurActif.ca || "—")}` : "Aucun joueur";
                return `<label class="tactic-slot" style="display:inline-flex;align-items:center;gap:6px;margin:0 12px 8px 0;font-size:12px">${escapeHtml(nomPoste(position) || "Poste")}<select data-slot="${escapeHtml(slot.numero)}" style="width:140px">${roleOptions || '<option value="">Aucun rôle</option>'}</select> <select class="tactic-joueur-select" data-slot="${escapeHtml(slot.numero)}" data-joueur-actuel="${escapeHtml(affectations[slot.numero] || "")}" style="width:160px"><option value="">Aucun joueur</option>${joueurOptions}</select> <span style="color:#888;font-size:10px">${joueurLabel}</span></label>`;
            })).join("");
        })()
        : "";
    const teamSlots = rawData.club_gere?.teams || [];
    const slotByTeamId = new Map(teamSlots.map(team => [String(team.team_id), Number(team.slot)]));
    const selectedTeamByPlayer = new Map(rawData.selections
        .filter(selection => selection.joueur_uid != null)
        .map(selection => [String(selection.joueur_uid), slotByTeamId.get(String(selection.team_id))]));
    const teamSlotFor = player => {
        if (player.team_slot != null && Number.isFinite(Number(player.team_slot))) return Number(player.team_slot);
        if (player.team_id != null && slotByTeamId.has(String(player.team_id))) return slotByTeamId.get(String(player.team_id));
        return selectedTeamByPlayer.get(String(player.uid)) ?? null;
    };
    const slotCounts = new Map();
    clubPlayers.forEach(player => {
        const slot = teamSlotFor(player);
        if (slot != null) slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
    });
    const hasDirectTeamData = clubPlayers.some(player => player.team_slot != null || player.team_id != null);
    const rosterFilters = [
        { id: "all", label: `Tout l’effectif (${clubPlayers.length})` },
        ...teamSlots.filter(team => slotCounts.has(Number(team.slot))).map(team => ({
            id: `team:${team.slot}`,
            label: `Équipe ${Number(team.slot) + 1}${hasDirectTeamData ? "" : " · sélection tactique"} (${slotCounts.get(Number(team.slot))})`
        })),
        ...(clubPlayers.some(player => Number(player.age) < 18)
            ? [{ id: "u18", label: `U18 (${clubPlayers.filter(player => Number(player.age) < 18).length})` }]
            : []),
        ...(clubPlayers.some(player => ["youngster", "future_prospect", "breakthrough_prospect"].includes(player.statut_effectif))
            ? [{ id: "prospects", label: `Espoirs (${clubPlayers.filter(player => ["youngster", "future_prospect", "breakthrough_prospect"].includes(player.statut_effectif)).length})` }]
            : [])
    ];
    if (!rosterFilters.some(filter => filter.id === clubRosterFilter)) clubRosterFilter = "all";
    const rosterFilterButtons = rosterFilters.map(filter =>
        `<button type="button" class="tab-btn${filter.id === clubRosterFilter ? " active" : ""}" data-club-roster-filter="${escapeHtml(filter.id)}">${escapeHtml(filter.label)}</button>`
    ).join("");
    const filteredSquad = clubPlayers.filter(player => {
        if (clubRosterFilter === "u18") return Number(player.age) < 18;
        if (clubRosterFilter === "prospects") return ["youngster", "future_prospect", "breakthrough_prospect"].includes(player.statut_effectif);
        if (clubRosterFilter.startsWith("team:")) return teamSlotFor(player) === Number(clubRosterFilter.slice(5));
        return true;
    });
    const positionsDisponibles = [...new Set(filteredSquad.flatMap(player => positionsProfil(player).map(position => position.key)))]
        .sort((a, b) => comparerPostes(nomPoste(a), nomPoste(b)));
    if (clubRosterPositionFilter !== "all" && !positionsDisponibles.includes(clubRosterPositionFilter)) {
        clubRosterPositionFilter = "all";
    }
    const positionFilterButtons = [
        `<button type="button" class="tab-btn${clubRosterPositionFilter === "all" ? " active" : ""}" data-club-position-filter="all">Tous postes</button>`,
        ...positionsDisponibles.map(position =>
            `<button type="button" class="tab-btn${clubRosterPositionFilter === position ? " active" : ""}" data-club-position-filter="${escapeHtml(position)}">${escapeHtml(codesTerrain[position] || position.toUpperCase())}</button>`
        )
    ].join("");
    const visibleSquad = filteredSquad.filter(player => clubRosterPositionFilter === "all"
        || positionsProfil(player).some(position => position.key === clubRosterPositionFilter))
        .sort(comparerEffectif);
    const colonnesEffectif = [
        ["poste", "Postes"], ["nom", "Joueur · statut"], ["age", "Âge"], ["ca", "CA"], ["pa", "PA"],
        ["valeur_marchande", "Valeur"], ["salaire_hebdomadaire", "Salaire / sem."]
    ];
    const entetesEffectif = colonnesEffectif.map(([key, label]) => {
        const disabled = modeDecouverte && (key === "ca" || key === "pa");
        const actif = clubRosterSort === key && !disabled;
        const sens = clubRosterAscending ? "ascending" : "descending";
        const indicateur = actif ? (clubRosterAscending ? " ▲" : " ▼") : "";
        return `<th scope="col"${actif ? ` aria-sort="${sens}"` : ""}><button type="button" class="club-sort-button" data-club-sort="${key}"${disabled ? " disabled title=\"Indisponible en mode découverte\"" : ""}>${label}<span aria-hidden="true">${indicateur}</span></button></th>`;
    }).join("");
    const squadEntries = visibleSquad.map(player => {
        const inlineBadges = [];
        const teamSlot = teamSlotFor(player);
        if (teamSlot != null) inlineBadges.push(`<span class="status-pill inline-team">Équipe ${teamSlot + 1}${hasDirectTeamData ? "" : " · sélection"}</span>`);
        if (player.en_pret) inlineBadges.push(`<span class="status-pill inline-status loan">En prêt${player.club_preteur ? ` · ${escapeHtml(player.club_preteur)}` : ""}</span>`);
        (player.blessures || []).forEach(injury => inlineBadges.push(`<span class="status-pill inline-status injured" title="${injury.date_retour ? `Retour estimé : ${escapeHtml(injury.date_retour)}` : "Blessure en cours"}">${escapeHtml(injury.nom || "Blessé")}</span>`));
        const status = traduireStatutEffectif(player.statut_effectif);
        if (player.statut_effectif && status !== "Non renseigné") inlineBadges.push(`<span class="status-pill inline-status">${escapeHtml(status)}</span>`);
        const positions = positionsProfil(player).sort((a, b) => comparerPostes(nomPoste(a.key), nomPoste(b.key)));
        const positionBadges = positions.length
            ? positions.slice(0, 5).map(position => {
                const group = position.key === "gk" ? "goalkeeper"
                    : ["dr", "dc", "dcg", "dcd", "dl", "wbr", "wbl"].includes(position.key) ? "defense"
                        : ["dm", "mc", "mr", "ml"].includes(position.key) ? "midfield" : "attack";
                return `<span class="squad-position-pill ${group}" title="${escapeHtml(nomPoste(position.key))}${position.rating == null ? "" : ` · ${position.rating}/20`}">${escapeHtml(codesTerrain[position.key] || position.key.toUpperCase())}</span>`;
            }).join("")
            : `<span class="profile-disclaimer">${escapeHtml(afficherPoste(player))}</span>`;
        return `<tr><td><div class="club-squad-positions">${positionBadges}</div></td><td>${linkJoueur(player)}${inlineBadges.length ? " " + inlineBadges.join(" ") : ""}</td><td>${player.age == null ? "—" : `${escapeHtml(player.age)} ans`}</td><td>${modeDecouverte ? "—" : escapeHtml(player.ca ?? "—")}</td><td>${modeDecouverte ? "—" : escapeHtml(player.pa ?? "—")}</td><td>${escapeHtml(estNombre(player.valeur_marchande) ? formatMoney(player.valeur_marchande) : "—")}</td><td>${escapeHtml(estNombre(player.salaire_hebdomadaire) ? formatMoney(player.salaire_hebdomadaire) : "—")}</td></tr>`;
    }).join("") || `<tr><td colspan="7" class="profile-disclaimer">Aucun joueur ne correspond à ce filtre.</td></tr>`;
    const injuriesNotice = rawData.erreur_blessures
        ? `<p class="caveat">Données de blessures indisponibles : ${escapeHtml(rawData.erreur_blessures)}</p>`
        : !Object.hasOwn(rawData, "erreur_blessures")
            ? `<p class="profile-disclaimer">Réimportez un export récent pour afficher les blessures en cours.</p>`
            : "";
    const transfersNotice = `<div class="club-transfer-groups">
        <section class="club-transfer-season"><h3>Historique par saison</h3><p>Aucun historique de transferts n’est fourni dans l’export actuel.</p></section>
        <section class="club-transfer-season"><h3>Transferts futurs ou en cours</h3><p>Les arrivées, départs et négociations en cours ne sont pas exportés par la version actuelle. Les statuts de contrat ou de prêt ne permettent pas de déduire ces mouvements.</p></section>
        <p class="profile-disclaimer">Cette section sera renseignée lorsque l’extracteur pourra fournir les mouvements de transfert de la sauvegarde.</p>
    </div>`;
    target.innerHTML = `<h2>${linkClub(rawData.club_gere?.name || "club géré non identifié", rawData.club_gere?.uid)} ${logoLocalHtml("club", rawData.club_gere?.unique_id, rawData.club_gere?.name)}</h2>
        <nav class="club-view-tabs" aria-label="Vues du club">
            <details class="club-menu" data-club-group="effectif"><summary>Effectif</summary><div class="club-menu-options">
                <button type="button" data-club-tab="effectif">Effectif</button>
                <button type="button" data-club-tab="diagnostic">Diagnostic</button>
                <button type="button" data-club-tab="performances">Performances</button>
                <button type="button" data-club-tab="jeunes">Développement des jeunes</button>
            </div></details>
            <details class="club-menu" data-club-group="tactique"><summary>Tactique</summary><div class="club-menu-options">
                <button type="button" data-club-tab="tactique">Ma tactique</button>
                <button type="button" data-club-tab="laboratoire">Laboratoire tactique</button>
                <button type="button" data-club-tab="optimisation">Optimiseur tactique</button>
            </div></details>
            <details class="club-menu" data-club-group="club"><summary>Club</summary><div class="club-menu-options">
                <button type="button" data-club-tab="overview">Vue d’ensemble</button>
                <button type="button" data-club-tab="transferts">Transferts</button>
                <button type="button" data-club-tab="confiance">Confiance des données</button>
            </div></details>
        </nav>
        <section class="club-view-panel" id="club-overview-effectif"${clubActiveTab === "effectif" ? "" : " hidden"}>
            <div class="club-roster-layout"><section class="club-roster-main">
            <h3>Effectif du club (${visibleSquad.length})</h3><div class="club-squad-filters">${rosterFilterButtons}</div><div class="club-position-filters">${positionFilterButtons}</div>
            ${!hasDirectTeamData && teamSlots.length ? `<p class="profile-disclaimer">L’export ne rattache pas chaque joueur à son équipe : les filtres par équipe montrent uniquement les joueurs présents dans les sélections tactiques exportées.</p>` : ""}
            ${injuriesNotice}<p class="profile-disclaimer">Cliquez sur une colonne pour trier. Salaire hebdomadaire actuel exporté ; données manquantes en fin de liste.</p><div class="scroll club-squad-table-wrap"><table class="club-squad-table"><thead><tr>${entetesEffectif}</tr></thead><tbody>${squadEntries}</tbody></table></div>
            </section><aside class="dashboard-card club-roster-tactics"><h3>Tactique</h3><label for="club-roster-tactic-select">Tactique enregistrée<select id="club-roster-tactic-select" data-club-tactic><option value="">Choisir une tactique</option>${tacticOptions}</select></label>${tacticPitch}${tacticDebug}${tacticPositionEditor}</aside></div>
        </section>
        <section class="club-view-panel" id="club-overview-tactique"${clubActiveTab === "tactique" ? "" : " hidden"}>
            <section class="dashboard-card club-tactics-card"><h3>Effectif sur le terrain tactique</h3><div class="club-tactic-controls"><label for="club-tactic-select">Tactique enregistrée<select id="club-tactic-select" data-club-tactic><option value="">Choisir une tactique</option>${tacticOptions}</select></label><label for="club-tactic-phase">Phase tactique<select id="club-tactic-phase" data-club-tactic-phase>${tacticalPhaseOptions}</select></label></div>${tacticPitch}${tacticDebug}${tacticPositionEditor}${tacticRoleControls}</section>
        </section>
        <section class="club-view-panel" id="club-overview-transferts"${clubActiveTab === "transferts" ? "" : " hidden"}><h3>Transferts</h3>${transfersNotice}</section>
        <section class="club-view-panel" id="club-overview-overview"${clubActiveTab === "overview" ? "" : " hidden"}>
            <h3>Que faire maintenant ?</h3><p><button type="button" id="export-club-report">Exporter une synthèse du club</button> <span id="club-report-status" role="status"></span></p><div class="dashboard-grid">
                <div class="dashboard-card"><h3>Effectif · ${clubPlayers.length} joueurs</h3><p>${tactic ? "Examinez les besoins selon la tactique choisie." : "Choisissez une tactique pour identifier les besoins."}</p><button type="button" data-home-club="diagnostic">Voir le diagnostic</button> <button type="button" data-home-club="effectif">Voir l’effectif</button></div>
                <div class="dashboard-card"><h3>Contrats · ${contracts.length} à six mois</h3><p>${gameDate ? "Échéances connues à partir de la date de sauvegarde." : "Date de sauvegarde indisponible."}</p><button type="button" data-home-view="alertes">Voir les alertes</button></div>
                <div class="dashboard-card"><h3>Recrutement</h3><p>Recherchez des renforts ou consultez les joueurs suivis.</p><button type="button" data-home-view="recrutement-poste">Recruter par poste</button> <button type="button" data-home-view="suivi">Voir le suivi</button></div>
                <div class="dashboard-card"><h3>Développement</h3><p>Comparez les jeunes entre les sauvegardes capturées.</p><button type="button" data-home-club="jeunes">Voir les jeunes</button> <button type="button" data-home-view="journal">Voir l’historique</button></div>
            </div>
            <details class="dashboard-card"><summary>Consulter tous les contrats du club (${tousContrats.length})</summary><p class="caveat">Joueurs et staff exportés, triés par date ; les dates absentes restent visibles. Salaire actuel, pas une prévision de renouvellement.</p><div class="scroll"><table><thead><tr><th>Personne</th><th>Poste ou métier</th><th>Fin</th><th>Échéance</th><th>Salaire actuel</th></tr></thead><tbody>${lignesContrats || '<tr><td colspan="5">Aucune personne identifiée.</td></tr>'}</tbody></table></div></details>
            <div class="club-overview-layout"><aside class="club-side-panels"><section class="dashboard-card club-set-pieces"><h3>Tireurs de coups de pied arrêtés · suggestions</h3><p class="caveat">Classement selon les attributs exportés; les tireurs affectés dans le jeu ne sont pas disponibles dans cette sauvegarde.</p><div class="club-set-pieces-grid">${setPieceCards}</div></section><section class="dashboard-card club-loans"><h3>Jeunes à prêter · à examiner (${loanCandidates.length})</h3><div class="club-loan-list">${loanEntries}</div></section></aside></div>
            <h3>Autres indicateurs du club</h3><div class="dashboard-grid"><div class="dashboard-card"><h3>Situation financière exportée</h3>${avertissementFinances()}<div class="dashboard-item">Budget transfert restant : ${formatMoney(finances.budget_transfert)}</div><div class="dashboard-item">Budget salaires : ${formatMoney(finances.budget_salaires_hebdomadaire)}/sem.</div><div class="dashboard-item">Masse salariale : ${formatMoney(finances.masse_salariale_hebdomadaire)}/sem.</div><div class="dashboard-item">Solde : ${formatMoney(finances.solde)}</div></div><div class="dashboard-card"><h3>Contrats à surveiller · 6 mois</h3>${contractEntries}</div><div class="dashboard-card"><h3>Suivi de développement CA</h3><p>Enregistrez une capture locale pour comparer le CA des joueurs de votre effectif à la prochaine sauvegarde. Ces instantanés restent dans ce navigateur.</p><button type="button" id="save-development-snapshot">Enregistrer cet instantané</button><div id="development-status" class="dashboard-item"></div></div><div class="dashboard-card"><h3>Plan d’entraînement</h3><p>Non calculé : les blocs d’entraînement de cette sauvegarde FM27 ne sont pas décodés par la version actuelle de l’extracteur, et les compétences métier nécessaires pour prévoir les étoiles des entraîneurs ne sont pas disponibles.</p></div></div><section id="actions-club"></section>
        </section>`;
    chargerPositionFixes(tactic?.id);
    chargerJoueurAffectes(tactic?.id);
    if (tactic && tactic.postes) {
        const positionsDisponibles = [
            ["gk", "Gardien"], ["dr", "DD"], ["dl", "DG"], ["dc", "DC"], ["dm", "MDF"], ["mdg", "MDG"], ["mdd", "MDD"],
            ["mc", "MC"], ["mcg", "MCG"], ["mcd", "MCD"], ["mr", "MD"], ["ml", "MG"],
            ["amr", "MOD"], ["aml", "MOG"], ["amc", "MOC"], ["stc", "BT"], ["btg", "BTG"], ["btd", "BTD"],
            ["wbr", "ALD"], ["wbl", "ALG"], ["sw", "Libero"]
        ];
        const fixesHtml = tactic.postes.map(slot => {
            const avecRaw = slot.avec_ball?.[0] || "";
            const sansRaw = slot.sans_ball?.[0] || "";
            const slotFixes = tacticPositionFixes[tactic.id] && tacticPositionFixes[tactic.id][slot.numero] || {};
            const actuelAvec = slotFixes.avec || "";
            const actuelSans = slotFixes.sans || "";
            const optionsHtml = positionsDisponibles.map(([code, label]) =>
                `<option value="${code}"${code === actuelAvec ? " selected" : ""}>${label}</option>`
            ).join("");
            const optionsHtmlSans = positionsDisponibles.map(([code, label]) =>
                `<option value="${code}"${code === actuelSans ? " selected" : ""}>${label}</option>`
            ).join("");
            return `
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin:4px 0">
                    <span style="min-width:60px;color:#888">Slot ${slot.numero}</span>
                    <select class="posfix-select" id="posfix-${tactic.id}-${slot.numero}-avec" style="width:120px">${optionsHtml}</select>
                    <span style="color:#888">Avec</span>
                    <select class="posfix-select" id="posfix-${tactic.id}-${slot.numero}-sans" style="width:120px">${optionsHtmlSans}</select>
                    <span style="color:#888">Sans</span>
                    <span style="color:#888;font-size:10px;margin-left:6px">(actuel : avec=${avecRaw || "?"}, sans=${sansRaw || "?"})</span>
                </label>
            `;
        }).join("");
        document.querySelectorAll(".tactic-position-fixes").forEach(container => {
            if (fixesHtml) {
                container.innerHTML = fixesHtml;
            } else {
                container.innerHTML = `<p style="font-size:12px;color:#2ecc71">Toutes les positions sans ballon sont définies. Aucune correction nécessaire.</p>`;
            }
        });
    }
    document.querySelectorAll("#club-view select[data-slot]").forEach(select => {
        select.addEventListener("change", () => {
            (tacticalRoles[tactic.id] || (tacticalRoles[tactic.id] = {}))[select.dataset.slot] = select.value;
            afficherTactiqueDetail();
            if (mode === "club") afficherMonClub();
            if (mode === "joueurs") filtrerTout();
        });
    });
    document.querySelectorAll("#club-view .tactic-joueur-select").forEach(select => {
        select.addEventListener("change", () => {
            const slotNumero = Number(select.dataset.slot);
            const valeur = select.value || null;
            if (!tacticJoueurAffectes[tactic.id]) tacticJoueurAffectes[tactic.id] = {};
            if (valeur) {
                tacticJoueurAffectes[tactic.id][slotNumero] = valeur;
            } else {
                delete tacticJoueurAffectes[tactic.id][slotNumero];
            }
            sauvegarderJoueurAffectes(tactic.id);
            afficherMonClub();
        });
    });
    afficherActionsClub();
    actualiserSuiviDeveloppement();
    document.getElementById("export-club-report")?.addEventListener("click", () => {
        const status = document.getElementById("club-report-status");
        try {
            const lines = [
                `Assistant FM — ${rawData.club_gere?.name || "Club non identifié"}`,
                `Date de sauvegarde : ${rawData.date_sauvegarde || "inconnue"}`,
                `Effectif : ${clubPlayers.length} joueur(s)`,
                `Tactique sélectionnée : ${tactic?.nom || "aucune"}`,
                `Budget de recrutement indicatif : ${formatMoney(finances.budget_transfert)}`,
                "", "CONTRATS DANS LES SIX MOIS"
            ];
            if (!gameDate) lines.push("Date de sauvegarde indisponible.");
            else if (!contracts.length) lines.push("Aucune échéance connue.");
            else contracts.forEach(person => lines.push(`${person.nom} — ${person.fin_contrat}`));
            lines.push("", "EFFECTIF");
            [...clubPlayers].sort((a, b) => comparerPostes(afficherPoste(a), afficherPoste(b)))
                .forEach(player => lines.push(`${player.nom} — ${afficherPoste(player)} — ${player.age == null ? "âge inconnu" : `${player.age} ans`}`));
            lines.push("", "Les notes, coûts estimés et affectations sont indicatifs. Vérifiez les informations dans FM. Les performances FM27 sont expérimentales.");
            const blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "assistant-fm-synthese.txt";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = "Synthèse de l’effectif complet exportée.";
        } catch (error) {
            status.textContent = `Export impossible : ${error.message}`;
        }
    });
    document.getElementById("save-development-snapshot").addEventListener("click", enregistrerInstantaneDeveloppement);
    target.querySelectorAll(".club-menu").forEach(menu => {
        const selected = menu.querySelector(`[data-club-tab="${clubActiveTab}"]`);
        menu.classList.toggle("active", Boolean(selected));
        if (selected) selected.setAttribute("aria-current", "page");
        menu.querySelector("summary").addEventListener("click", () => {
            target.querySelectorAll(".club-menu[open]").forEach(other => {
                if (other !== menu) other.open = false;
            });
        });
        menu.querySelectorAll("[data-club-tab]").forEach(button => button.addEventListener("click", () => {
            const group = menu.dataset.clubGroup;
            clubActiveTab = button.dataset.clubTab;
            changerOnglet("club");
            target.querySelector(`[data-club-group="${group}"] summary`)?.focus();
        }));
    });
    target.querySelectorAll("[data-home-club]").forEach(button => button.addEventListener("click", () => {
        clubActiveTab = button.dataset.homeClub;
        changerOnglet("club");
    }));
    target.querySelectorAll("[data-home-view]").forEach(button => button.addEventListener("click", () => changerOnglet(button.dataset.homeView)));
    target.querySelectorAll("[data-club-roster-filter]").forEach(button => button.addEventListener("click", () => {
        clubRosterFilter = button.dataset.clubRosterFilter;
        afficherMonClub();
    }));
    target.querySelectorAll("[data-club-position-filter]").forEach(button => button.addEventListener("click", () => {
        clubRosterPositionFilter = button.dataset.clubPositionFilter;
        afficherMonClub();
    }));
    target.querySelectorAll("[data-club-sort]").forEach(button => button.addEventListener("click", () => {
        const colonne = button.dataset.clubSort;
        clubRosterAscending = clubRosterSort === colonne ? !clubRosterAscending : true;
        clubRosterSort = colonne;
        afficherMonClub();
        target.querySelector(`[data-club-sort="${colonne}"]`)?.focus();
    }));
    target.querySelectorAll("[data-club-tactic]").forEach(select => select.addEventListener("change", event => {
        document.getElementById("tactique-select").value = event.target.value;
        afficherTactiqueDetail();
        afficherMonClub();
    }));
    target.querySelectorAll("[data-club-tactic-phase]").forEach(select => select.addEventListener("change", event => {
        setTacticalPitchMode(event.target.value);
    }));
}

function cleHistoriqueDeveloppement() {
    const club = rawData.club_gere?.uid || rawData.club_gere?.name || "club";
    return clePourPartie(`assistantfm-ca-${club}`);
}

function lireHistoriqueDeveloppement() {
    const value = localStorage.getItem(cleHistoriqueDeveloppement());
    if (!value) return [];
    const snapshots = JSON.parse(value);
    if (!Array.isArray(snapshots)) throw new Error("Historique local invalide; supprimez-le depuis les données du navigateur.");
    return snapshots;
}

function actualiserSuiviDeveloppement(message = "") {
    const status = document.getElementById("development-status");
    if (!status) return;
    if (modeDecouverte) {
        status.textContent = "Suivi de CA masqué en mode découverte.";
        return;
    }
    try {
        const history = lireHistoriqueDeveloppement();
        const current = history[history.length - 1];
        const previous = history[history.length - 2];
        if (!current) {
            status.textContent = message || "Aucun instantané enregistré.";
            return;
        }
        if (!previous) {
            status.textContent = message || `Dernier instantané : ${current.dateJeu || "date inconnue"} · première capture, pas encore de comparaison.`;
            return;
        }
        const before = new Map((previous.joueurs || []).map(player => [String(player.uid), player]));
        const changes = (current.joueurs || [])
            .filter(player => before.has(String(player.uid))
                && estNombre(player.ca) && estNombre(before.get(String(player.uid)).ca))
            .map(player => ({ player, delta: Number(player.ca) - Number(before.get(String(player.uid)).ca) }))
            .filter(item => item.delta !== 0)
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        const summary = `${changes.length} variation(s) de CA détectée(s) entre ${previous.dateJeu || "capture précédente"} et ${current.dateJeu || "capture actuelle"}.`;
        const details = changes.slice(0, 5).map(item => {
            const player = rawData.joueurs.find(candidate => String(candidate.uid) === String(item.player.uid));
            const name = player ? linkJoueur(player) : escapeHtml(item.player.nom);
            return `${name} : ${item.delta > 0 ? "+" : ""}${item.delta}`;
        }).join(" · ");
        const prefix = message ? `${escapeHtml(message)}<br>` : "";
        status.innerHTML = `${prefix}${escapeHtml(summary)}${details ? `<br>${details}` : ""}`;
    } catch (error) {
        status.textContent = `Erreur de lecture de l’historique local : ${error.message}`;
    }
}

function enregistrerInstantaneDeveloppement() {
    const status = document.getElementById("development-status");
    if (modeDecouverte) {
        status.textContent = "Capture de CA désactivée en mode découverte.";
        return;
    }
    try {
        const history = lireHistoriqueDeveloppement();
        history.push({
            dateJeu: rawData.date_sauvegarde || null,
            capturedAt: new Date().toISOString(),
            joueurs: rawData.joueurs
                .filter(player => player.est_mon_club === true && player.uid != null)
                .map(player => ({ uid: player.uid, nom: player.nom, ca: player.ca, pa: player.pa }))
        });
        if (history.length > 50) history.splice(0, history.length - 50);
        localStorage.setItem(cleHistoriqueDeveloppement(), JSON.stringify(history));
        actualiserSuiviDeveloppement("Instantané enregistré dans ce navigateur.");
    } catch (error) {
        status.textContent = `Impossible d’enregistrer l’instantané local : ${error.message}`;
    }
}

function ajouterFiltreAttribut() {
    const row = document.createElement("div");
    row.className = "attribute-filter-row";
    row.innerHTML = '<label class="player-filter">Attribut<select aria-label="Attribut"><option value="">Choisir un attribut</option></select></label>'
        + '<label class="player-filter">Minimum<input type="number" min="1" max="20" step="1" aria-label="Attribut minimum"></label>'
        + '<label class="player-filter">Maximum<input type="number" min="1" max="20" step="1" aria-label="Attribut maximum"></label>'
        + '<button type="button" data-remove-attribute aria-label="Supprimer ce critère">Supprimer</button>';
    const select = row.querySelector("select");
    Object.entries(nomsStats).sort((a, b) => a[1].localeCompare(b[1], "fr")).forEach(([key, label]) => {
        select.add(new Option(label, key));
    });
    attributeFilterRows.appendChild(row);
    select.focus();
}

function lireFiltresAttributs() {
    const criteres = [];
    for (const row of attributeFilterRows.children) {
        const key = row.querySelector("select").value;
        const [min, max] = row.querySelectorAll("input");
        if (!min.checkValidity() || !max.checkValidity()
            || (min.value !== "" && max.value !== "" && Number(min.value) > Number(max.value))) {
            return { criteres: [], erreur: "Les attributs doivent être compris entre 1 et 20, avec un minimum inférieur ou égal au maximum." };
        }
        if (!key && (min.value !== "" || max.value !== "")) {
            return { criteres: [], erreur: "Choisissez un attribut pour chaque critère renseigné." };
        }
        if (key && (min.value !== "" || max.value !== "")) {
            criteres.push({ key, min: min.value === "" ? null : Number(min.value), max: max.value === "" ? null : Number(max.value) });
        }
    }
    return { criteres, erreur: "" };
}

function correspondAuxFiltresJoueur(player, criteresAttributs = []) {
    if (!respecteBornes(player.age, "age-min", "age-max")) return false;
    if (!respecteBornes(player.ca, "ca-min", "ca-max")) return false;
    if (!respecteBornes(player.pa, "pa-min", "pa-max")) return false;
    if (!respecteBornes(player.valeur_marchande, "valeur-min", "valeur-max")) return false;
    if (!respecteBornes(player.salaire_hebdomadaire, "salaire-min", "salaire-max")) return false;
    const coutMax = document.getElementById("cout-max").value;
    if (coutMax !== "") {
        const cout = coutEstime(player);
        if (!estNombre(cout) || Number(cout) > Number(coutMax)) return false;
    }
    for (const critere of criteresAttributs) {
        const value = player.stats?.[critere.key];
        if (value == null || value === "" || !Number.isFinite(Number(value))
            || (critere.min !== null && Number(value) < critere.min)
            || (critere.max !== null && Number(value) > critere.max)) return false;
    }

    const positionChoisie = document.getElementById("poste-filter").value;
    if (positionChoisie) {
        const rating = Number(player.positions?.[positionChoisie]);
        const codes = [...(player.positions_naturelles || []), ...String(player.poste || "").split(/\s*\/\s*/)];
        const positionNaturelle = codes.some(code =>
            codePosteNom[String(code).toUpperCase()] === positionChoisie || String(code).toLowerCase() === positionChoisie
        );
        if (!positionNaturelle && !(Number.isFinite(rating) && rating > 1)) return false;
    }

    const piedChoisi = document.getElementById("pied-filter").value;
    if (piedChoisi && player.pied_fort !== piedChoisi) return false;
    if (document.getElementById("ue-only").checked && !personneUE(player)) return false;

    const contractFilter = document.getElementById("contrat-filter").value;
    if (contractFilter === "yes" && player.sous_contrat !== true) return false;
    if (contractFilter === "no" && player.sous_contrat !== false) return false;
    return true;
}

function respecteBornes(value, minId, maxId) {
    const minimum = document.getElementById(minId).value.trim();
    const maximum = document.getElementById(maxId).value.trim();
    if (!minimum && !maximum) return true;
    if (value == null || value === "") return false;
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
        && (!minimum || numericValue >= Number(minimum))
        && (!maximum || numericValue <= Number(maximum));
}

function cellule(row, value) {
    const td = document.createElement("td");
    td.textContent = value == null || value === "" ? "—" : String(value);
    row.appendChild(td);
    return td;
}

function celluleProfil(row, name, kind = "club", id = null) {
    const td = document.createElement("td");
    td.innerHTML = kind === "club" ? linkClub(name, id) : escapeHtml(name);
    row.appendChild(td);
    return td;
}

function celluleNote(row, value) {
    const td = document.createElement("td");
    const note = document.createElement("span");
    note.className = clsNote(value);
    note.textContent = value == null ? "—" : String(value);
    td.appendChild(note);
    row.appendChild(td);
}

function render(append) {
    if (!append) tbody.replaceChildren();
    if (listAct.length === 0) {
        const row = document.createElement("tr");
        const cell = cellule(row, "Aucun profil correspondant trouvé.");
        cell.colSpan = document.getElementById("th-dynamique").children.length;
        cell.style.cssText = "text-align:center;color:#aaa;padding:20px;";
        tbody.appendChild(row);
        return;
    }

    const start = append ? tbody.rows.length : 0;
    const end = Math.min(maxRow, listAct.length);
    const fragment = document.createDocumentFragment();
    listAct.slice(start, end).forEach(person => {
        const row = document.createElement("tr");
        row.addEventListener("click", event => {
            if (event.target instanceof Element && event.target.closest("[data-profile-kind]")) return;
            ouvrirProfil(mode === "staff" ? "staff" : "joueur", person.uid);
        });
        const name = document.createElement("td");
        name.innerHTML = mode === "staff" ? linkStaff(person) : linkJoueur(person);
        row.appendChild(name);
        if (mode === "staff") {
            celluleRechercheHtml(row, celluleNationalite(person));
            cellule(row, traduireMetier(person.metier));
            cellule(row, person.age == null ? null : `${person.age} ans`);
            celluleNote(row, person.ca);
            celluleNote(row, person.pa);
            celluleRechercheHtml(row, linkCompetition(classementPersonne(person), clubPourPersonne(person) || {}, liguePersonne(person) || "—")).title = "Nom de compétition issu des données ou corrections locales ; non vérifié.";
            cellule(row, estNombre(person.salaire_hebdomadaire) ? `${formatMoney(person.salaire_hebdomadaire)}/sem.` : null);
            celluleRechercheHtml(row, celluleClub(person));
        } else {
            cellule(row, posteAbrege(person));
            celluleRechercheHtml(row, celluleNationalite(person));
            celluleRechercheHtml(row, linkCompetition(classementPersonne(person), clubPourPersonne(person) || {}, liguePersonne(person) || "—")).title = "Nom de compétition issu des données ou corrections locales ; non vérifié.";
            celluleRechercheHtml(row, celluleClub(person));
            cellule(row, person.age == null ? null : `${person.age} ans`);
            cellule(row, estNombre(person.taille_cm) && Number(person.taille_cm) > 0 ? `${person.taille_cm} cm` : null);
            cellule(row, piedFrancais(person.pied_fort));
            cellule(row, estNombre(person.salaire_hebdomadaire) ? `${formatMoney(person.salaire_hebdomadaire)}/sem.` : null);
            celluleNote(row, person.ca);
            celluleNote(row, person.pa);
            cellule(row, person.reputation);
            cellule(row, formatMoney(person.cout_estime));
            const fit = cellule(row, "");
            fit.textContent = person.role_recrutement
                ? `${person.role_recrutement.label} · ${person.role_recrutement.score.toFixed(1)}/20`
                : meilleurRole(person).label || "À évaluer";
        }
        fragment.appendChild(row);
    });
    tbody.appendChild(fragment);
}

function celluleRechercheHtml(row, html) {
    const td = document.createElement("td");
    td.innerHTML = html;
    row.appendChild(td);
    return td;
}

function celluleNationalite(person) {
    const name = nomNation(person) || "Non renseignée";
    const code = codesNationsFM[person?.nation_uid];
    const fallback = drapeauEmoji(code);
    const logo = logoLocalHtml("nation", person?.nation_uid, `Drapeau ${name}`);
    const marker = `<span class="profile-visual-mark profile-flag-mark search-logo${logo ? " has-logo" : ""}"${logo ? ` data-fallback="${escapeHtml(fallback)}"` : ""} title="${escapeHtml(name)}">${logo || escapeHtml(fallback)}</span>`;
    return `<span class="search-nationality">${marker}<span>${escapeHtml(name)}</span></span>`;
}

function celluleClub(person) {
    const club = clubPourPersonne(person);
    const name = String(person?.club || "Sans club").trim();
    const logo = logoLocalHtml("club", club?.unique_id, `Logo ${name}`);
    const fallback = initialesVisuelles(name);
    const marker = `<span class="profile-visual-mark profile-club-mark search-logo${logo ? " has-logo" : ""}"${logo ? ` data-fallback="${escapeHtml(fallback)}"` : ""} title="Logo ${escapeHtml(name)}">${logo || escapeHtml(fallback)}</span>`;
    return `<span class="search-club">${marker}${linkClub(name, person?.club_uid)}</span>`;
}

function piedFrancais(foot) {
    return ({ droite: "Droit", gauche: "Gauche", ambidextre: "Ambidextre" })[foot] || "";
}

function pop() {
    if (!entSel) return;
    document.getElementById("modal-title").textContent = entSelMode === "competition"
        ? nomCompetition(entSel) || "Compétition"
        : entSel.nom || "Fiche profil";
    document.querySelector("#stat-modal .modal-content").classList.add("profile-modal");
    refreshPop();
    document.getElementById("stat-modal").style.display = "flex";
}

function positionsProfil(player) {
    const ratings = player.positions || {};
    const positions = new Map();
    Object.entries(ratings).forEach(([rawPosition, rawRating]) => {
        const key = clePoste[String(rawPosition).toLowerCase()]
            || codePosteNom[String(rawPosition).toUpperCase()];
        const rating = Number(rawRating);
        if (!key || !Number.isFinite(rating) || rating <= 1) return;
        const previous = positions.get(key);
        if (!previous || rating > previous.rating) positions.set(key, { key, rating });
    });
    (player.positions_naturelles || []).forEach(rawPosition => {
        const key = codePosteNom[String(rawPosition).toUpperCase()]
            || clePoste[String(rawPosition).toLowerCase()];
        if (key && !positions.has(key)) positions.set(key, { key, rating: estNombre(ratings[key]) ? Number(ratings[key]) : null });
    });
    if (!positions.size) {
        String(player.poste || "").split(/\s*\/\s*/).forEach(rawPosition => {
            const key = codePosteNom[String(rawPosition).toUpperCase()]
                || clePoste[String(rawPosition).toLowerCase()];
            if (key && !positions.has(key)) positions.set(key, { key, rating: estNombre(ratings[key]) ? Number(ratings[key]) : null });
        });
    }
    return [...positions.values()].sort((a, b) => comparerPostes(a.key, b.key));
}

function positionInitialeProfil(player) {
    const positions = positionsProfil(player);
    const requested = document.getElementById("poste-filter")?.value;
    if (requested && positions.some(position => position.key === requested)) return requested;
    const tactical = posteRoleTactique(player)?.position;
    if (tactical && positions.some(position => position.key === tactical)) return tactical;
    return meilleurRole(player).position || positions[0]?.key || "";
}

function etoiles(value) {
    const normalized = Math.max(0, Math.min(20, Number(value) || 0));
    const full = Math.floor(normalized / 4);
    const half = normalized % 4 >= 2 ? 1 : 0;
    const empty = 5 - full - half;
    return `<span class="profile-stars" aria-label="${normalized.toFixed(1)} sur 20">${"★".repeat(full)}${half ? "◐" : ""}${"☆".repeat(empty)}</span>`;
}

function attributsPotentiels(person) {
    return person.stats_potentiels
        || person.potential_stats
        || person.potential_attributes
        || person.attributes_potential
        || {};
}

function ligneAttributProfil(key, stats, highlights, potentialStats = {}, comparisonStats = null) {
    const rawValue = stats[key];
    if (!estNombre(rawValue)) return "";
    const value = Number(rawValue);
    const rawPotential = potentialStats[key];
    const potential = estNombre(rawPotential) ? Number(rawPotential) : null;
    const rawComparison = comparisonStats?.[key];
    const comparison = estNombre(rawComparison) ? Number(rawComparison) : null;
    const width = Math.max(0, Math.min(100, value / 20 * 100));
    const priority = highlights.has(key) ? " priority" : "";
    const secondary = comparisonStats === null ? potential : comparison;
    const difference = comparisonStats !== null && comparison !== null ? value - comparison : null;
    const comparisonClass = difference === null ? "" : difference > 0
        ? " comparison-better"
        : difference < 0 ? " comparison-worse" : " comparison-equal";
    const delta = difference === null ? "" : `<span class="comparison-delta${comparisonClass}">${difference > 0 ? "+" : ""}${difference}</span>`;
    const valueTitle = comparisonStats !== null
        ? "Valeur actuelle / valeur du joueur de référence"
        : potential == null
            ? "Valeur actuelle / potentiel individuel non disponible dans la sauvegarde"
            : "Valeur actuelle / potentiel individuel";
    const missingClass = comparisonStats === null ? potential == null : comparison == null;
    const explanation = explicationsAttributs[key] || "Attribut Football Manager évalué sur 20.";
    return `<div class="profile-stat${priority}"><div class="profile-stat-line"><span class="profile-stat-label" title="${escapeHtml(explanation)}">${escapeHtml(nomsStats[key] || key.replace(/_/g, " "))}</span><strong class="profile-stat-values${comparisonClass}" title="${valueTitle}"><span>${escapeHtml(value)}</span><span class="profile-stat-separator">/</span><span class="${missingClass ? "profile-stat-potential missing" : "profile-stat-potential"}">${escapeHtml(secondary ?? "—")}</span>${delta}</strong></div><div class="profile-stat-track"><div class="profile-stat-fill" style="width:${width}%"></div></div></div>`;
}

function blocAttributsProfil(stats, highlights, potentialStats = {}) {
    const shown = new Set();
    let html = "";
    Object.entries(attributsParFamille).forEach(([family, keys]) => {
        const rows = keys.map(key => {
            if (!Object.hasOwn(stats, key)) return "";
            shown.add(key);
            return ligneAttributProfil(key, stats, highlights, potentialStats);
        }).filter(Boolean).join("");
        if (rows) html += `<section class="profile-section"><h3>${escapeHtml(family)}</h3>${rows}</section>`;
    });
    const remaining = Object.keys(stats).filter(key => !shown.has(key)).sort();
    if (remaining.length) {
        const rows = remaining.map(key => ligneAttributProfil(key, stats, highlights, potentialStats)).join("");
        if (rows) html += `<section class="profile-section"><h3>Autres données exportées</h3>${rows}</section>`;
    }
    if (!html) html = `<section class="profile-section"><h3>Attributs disponibles</h3><p class="profile-disclaimer">Aucun attribut n’a été exporté pour ce profil.</p></section>`;
    return html;
}

function renderPositionPanel(player, positionKey) {
    const positions = positionsProfil(player);
    const postesTerrain = Object.keys(codesTerrain).filter(position => !["dc", "dm", "mc", "stc"].includes(position)).map(position => ({
        position,
        canonicalPosition: ["dcg", "dcd"].includes(position) ? "dc"
            : ["mdg", "mdd"].includes(position) ? "dm"
                : ["mcg", "mcd"].includes(position) ? "mc"
                    : ["btg", "btd"].includes(position) ? "stc" : position
    }));
    const placement = placerPostesTerrain(postesTerrain);
    const notes = new Map(positions.map(position => [position.key, position.rating]));
    const marks = placement.places.map(({ position, canonicalPosition, row, col }) => {
        const brut = player.positions?.[canonicalPosition];
        const note = estNombre(brut) && Number(brut) >= 1 && Number(brut) <= 20 ? Number(brut) : null;
        const niveau = note === null ? "inconnu" : note >= 18 ? "naturel" : note >= 15 ? "bon" : note >= 10 ? "moyen" : "faible";
        const label = `${nomPosteTerrain(position)} · ${note === null ? "aptitude non disponible" : `${note}/20`}`;
        const content = `${escapeHtml(codesTerrain[position])}<small>${note ?? "—"}</small>`;
        return notes.has(canonicalPosition)
            ? `<button type="button" class="position-map-marker ${niveau}${canonicalPosition === positionKey ? " selected" : ""}" data-profile-position="${escapeHtml(canonicalPosition)}" style="grid-row:${row};grid-column:${col}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${content}</button>`
            : `<span class="position-map-marker ${niveau}" style="grid-row:${row};grid-column:${col}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${content}</span>`;
    }).join("");
    const rows = positions.map(position =>
        `<div class="profile-position${position.key === positionKey ? " researched" : ""}"><span>${escapeHtml(nomPoste(position.key))}</span><span>${position.rating === null ? "Note inconnue" : etoiles(position.rating)}</span></div>`
    ).join("");
    const selected = positions.find(position => position.key === positionKey);
    return `<section class="profile-section"><h3>Postes et aptitudes</h3><div class="position-map" role="group" aria-label="Aptitudes aux postes" style="--pitch-columns:${placement.colonnes};--pitch-rows:${placement.lignes}">${marks}</div><p class="position-map-legend"><span class="position-map-legend-item"><i class="position-map-legend-dot naturel"></i>18–20</span><span class="position-map-legend-item"><i class="position-map-legend-dot bon"></i>15–17</span><span class="position-map-legend-item"><i class="position-map-legend-dot moyen"></i>10–14</span><span class="position-map-legend-item"><i class="position-map-legend-dot faible"></i>1–9</span><span class="position-map-legend-item"><i class="position-map-legend-dot inconnu"></i>Inconnu</span></p><p class="profile-disclaimer">Aptitude au poste exportée /20, pas une note de rôle. Cliquez sur un poste évaluable pour changer l’analyse.</p><div class="profile-position-list">${rows || "<div class=\"profile-disclaimer\">Postes non disponibles.</div>"}</div><div class="profile-contract"><div class="profile-stat-line"><span>Maîtrise au poste ciblé</span><strong>${selected && estNombre(player.positions?.[selected.key]) ? `${escapeHtml(selected.rating)}/20` : "—"}</strong></div>${selected && estNombre(player.positions?.[selected.key]) ? etoiles(selected.rating) : ""}</div></section>`;
}

function renderRolePanel(player, positionKey, selectedRoleId) {
    const options = rolesParPoste[positionKey] || [];
    if (!options.length) return "";
    const scored = options.map(roleId => ({
        roleId,
        score: noteRole(player, roles[roleId], positionKey)
    })).sort((a, b) => (Number.isFinite(b.score) ? b.score : -1) - (Number.isFinite(a.score) ? a.score : -1));
    const roleRows = scored.map(({ roleId, score }) =>
        `<div class="profile-role${roleId === selectedRoleId ? " selected" : ""}"><span>${escapeHtml(roles[roleId].nom)}${roleId === selectedRoleId ? " · recherché" : ""}</span>${etoiles(Number.isFinite(score) ? score : 0)}</div>`
    ).join("");
    return `<section class="profile-section profile-role-details profile-highlight"><div class="profile-roles-heading"><h3>Rôles pour ${escapeHtml(nomPoste(positionKey) || "poste recherché")}</h3><span class="profile-control-hint">Adéquation estimée à partir des attributs disponibles · sur 20</span></div><div class="profile-role-list">${roleRows}</div></section>`;
}

function classementClubActuel(club) {
    return [...(club?.classements || [])].sort((a, b) =>
        Number(a.equipe_slot ?? Number.MAX_SAFE_INTEGER) - Number(b.equipe_slot ?? Number.MAX_SAFE_INTEGER)
        || Number(b.matches_joues || 0) - Number(a.matches_joues || 0)
    )[0] || null;
}

function initialesVisuelles(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    return (words.length > 1
        ? words.slice(0, 2).map(word => [...word][0] || "").join("")
        : [...(words[0] || "FM")].slice(0, 2).join("")
    ).toLocaleUpperCase("fr");
}

function logoLocalHtml(type, id, alt) {
    const normalizedId = String(id ?? "");
    if (!/^\d+$/.test(normalizedId) || !["club", "comp", "nation"].includes(type)) return "";
    const imageClass = type === "nation" ? " profile-nation-flag" : "";
    return `<img class="profile-logo-image${imageClass}" src="/api/logo/${type}/${normalizedId}" alt="${escapeHtml(alt)}" loading="lazy" onerror="const mark=this.closest('.profile-visual-mark, .club-crest');this.remove();if(mark){mark.classList.remove('has-logo');mark.textContent=mark.dataset.fallback||''}">`;
}

function drapeauEmoji(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) return "⚑";
    return [...normalized]
        .map(character => String.fromCodePoint(0x1f1e6 + character.charCodeAt(0) - 65))
        .join("");
}

function renduVisuelsProfil(club, person = {}, inline = false) {
    const team = club || {};
    const standing = classementClubActuel(team);
    const hasPerson = Object.keys(person).length > 0;
    const country = hasPerson ? person : team;
    const countryId = country.nation_uid;
    const countryLabel = nomNation(country) || "Pays non disponible";
    const countryCode = person.nation_iso2 || person.country_code
        || (!hasPerson ? team.nation_iso2 || team.country_code : null)
        || codesNationsFM[countryId];
    const divisionName = nomCompetition(standing, team);
    const divisionLabel = divisionName || "Compétition non disponible";
    const rank = standing?.position == null
        ? team.last_league_position != null
            ? `Classement actuel indisponible · dernier classement : ${team.last_league_position}`
            : "Classement actuel indisponible"
        : `Classement : ${standing.position}${standing.position === 1 ? "er" : "e"}${standing.nombre_clubs ? ` / ${standing.nombre_clubs}` : ""}`;
    const clubName = team.short_name || team.name || person.club || "Club non renseigné";
    const divisionMark = divisionName
        ? initialesVisuelles(divisionName)
        : standing?.competition_id != null ? `#${standing.competition_id}` : "DIV";
    const clubLogo = logoLocalHtml("club", team.unique_id, `Logo ${clubName}`);
    const divisionLogo = standing
        ? logoLocalHtml("comp", standing.competition_uid, `Logo ${divisionLabel}`)
        : "";
    const countryFlag = logoLocalHtml("nation", countryId, `Drapeau ${countryLabel}`);
    const flagMark = countryFlag
        ? `<span class="profile-visual-mark profile-flag-mark has-logo" data-fallback="${escapeHtml(drapeauEmoji(countryCode))}" title="Drapeau du pays">${countryFlag}</span>`
        : `<span class="profile-visual-mark profile-flag-mark" title="Drapeau du pays">${escapeHtml(drapeauEmoji(countryCode))}</span>`;
    const clubMark = clubLogo
        ? `<span class="profile-visual-mark profile-club-mark has-logo" data-fallback="${escapeHtml(initialesVisuelles(clubName))}" title="Logo du club">${clubLogo}</span>`
        : `<span class="profile-visual-mark profile-club-mark" title="Logo du club">${escapeHtml(initialesVisuelles(clubName))}</span>`;
    const divisionMarkHtml = divisionLogo
        ? `<span class="profile-visual-mark profile-division-mark has-logo" data-fallback="${escapeHtml(divisionMark)}" title="Logo de la division">${divisionLogo}</span>`
        : `<span class="profile-visual-mark profile-division-mark" title="Logo de la division">${escapeHtml(divisionMark)}</span>`;
    const divisionKey = cleCompetition(standing);
    const divisionMarkLink = divisionKey
        ? `<button type="button" class="competition-mark-link" data-profile-kind="competition" data-profile-id="${escapeHtml(divisionKey)}" aria-label="Ouvrir ${escapeHtml(divisionLabel)}">${divisionMarkHtml}</button>`
        : divisionMarkHtml;
    const divisionLink = linkCompetition(standing, team, divisionLabel);
    const selectionsNationales = Array.isArray(person.selections_nationales) && person.selections_nationales.length
        ? `<div class="selections-nationales"><small>Sélections nationales : ${escapeHtml(person.selections_nationales.length)}</small></div>`
        : "";
    if (inline) {
        return `<div class="profile-inline-assets" aria-label="Pays, club et compétition"><div class="profile-inline-asset">${flagMark}<div><strong>${escapeHtml(countryLabel)}</strong>${selectionsNationales}</div></div><div class="profile-inline-asset">${clubMark}${hasPerson ? linkClub(clubName, team.uid ?? person.club_uid) : `<span>${escapeHtml(clubName)}</span>`}</div><div class="profile-inline-asset" title="Nom de compétition issu des données ou corrections locales ; non vérifié.">${divisionMarkLink}<span>${divisionLink}${standing?.position == null ? "" : ` · ${escapeHtml(rank)}`}</span></div></div>`;
    }
    return `<section class="profile-visual-assets" aria-label="Pays, club et compétition"><div class="profile-visual-card">${flagMark}<div class="profile-visual-text"><small>Drapeau du pays</small><strong>${escapeHtml(countryLabel)}</strong></div></div><div class="profile-visual-card">${clubMark}<div class="profile-visual-text"><small>Logo du club</small><strong>${escapeHtml(clubName)}</strong></div></div><div class="profile-visual-card" title="Nom de compétition issu des données ou corrections locales ; non vérifié.">${divisionMarkLink}<div class="profile-visual-text"><small>Compétition · classement disponible</small><strong>${divisionLink}</strong><span>${escapeHtml(rank)}</span></div></div><p class="profile-visual-note">Logos, drapeaux et visages sont chargés depuis les fichiers graphiques locaux lorsqu’ils correspondent aux identifiants FM. Les noms de compétition issus des données ou corrections locales ne sont pas vérifiés. Le classement disponible peut être celui d’une coupe plutôt que du championnat.</p></section>`;
}

function ongletsProfil(staff = false) {
    const bouton = (tab, label) => `<button type="button" class="tab-btn${profileActiveTab === tab ? " active" : ""}" id="${tab}-tab-button" role="tab" aria-selected="${profileActiveTab === tab}" aria-controls="profile-tab-${tab}" data-profile-tab="${tab}">${label}</button>`;
    return `<div class="profile-tab-nav" role="tablist" aria-label="Sections de la fiche ${staff ? "staff" : "joueur"}">${bouton("profile", "Profil")}${bouton("career", "Carrière")}${staff ? "" : bouton("recruitment", "Analyse de recrutement")}</div>`;
}

function renderCareerProfile(person, staff = false) {
    if (staff) return `<section class="profile-section"><h3>Carrière du staff</h3><p>L’historique des postes occupés par le staff n’est pas fourni par l’extracteur actuel.</p></section>`;
    const noteHtml = (valeur) => {
        const n = typeof valeur === "number" && Number.isFinite(valeur)
            ? valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
        return `<span class="career-note">${escapeHtml(n)}</span>`;
    };
    const cellStat = (valeur) => `<td class="career-cell-stat">${escapeHtml(valeur == null ? "—" : String(valeur))}</td>`;
    const cellLogoTexte = (logoHtml, texte) => `<td class="career-cell-club">${logoHtml}${escapeHtml(texte ?? "—")}</td>`;
    const saisonActuelle = Array.isArray(person.saison_carriere) ? person.saison_carriere : [];
    const lignesArchives = Array.isArray(person.historique_carriere)
        ? [...person.historique_carriere].sort((a, b) => (Number(b.annee) || 0) - (Number(a.annee) || 0))
        : [];
    const regrouperParCompetition = (lignes) => {
        const map = new Map();
        lignes.forEach(ligne => {
            const cle = String(ligne.competition || ligne.type || "Autre");
            if (!map.has(cle)) map.set(cle, { lignes: [], competition_uid: ligne.competition_uid });
            map.get(cle).lignes.push(ligne);
        });
        return map;
    };
    const agregerSaison = (lignes) => {
        const totalApps = lignes.reduce((s, l) => s + Number(l.total_apparitions || l.titulaires || 0) || 0, 0);
        const totalButs = lignes.reduce((s, l) => s + Number(l.buts || 0) || 0, 0);
        const totalPasses = lignes.reduce((s, l) => s + Number(l.passes || l.decisive || 0) || 0, 0);
        const notes = lignes.filter(l => typeof l.note === "number" && Number.isFinite(l.note)).map(l => l.note);
        const noteMoy = notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : null;
        return { totalApps, totalButs, totalPasses, noteMoy };
    };
    let saisonHtml = "";
    if (rawData.erreur_statistiques_saison) {
        saisonHtml = `<p role="alert">Lecture de la saison actuelle impossible : ${escapeHtml(rawData.erreur_statistiques_saison)}</p>`;
    } else if (!saisonActuelle.length) {
        saisonHtml = "<p>Aucune statistique de saison actuelle disponible pour ce joueur.</p>";
    } else {
        const groupes = regrouperParCompetition(saisonActuelle);
        const rows = [...groupes.entries()].map(([nom, groupe]) => {
            const agg = agregerSaison(groupe.lignes);
            const annee = groupe.lignes[0]?.annee ?? "—";
            const logo = logoLocalHtml("comp", groupe.competition_uid, nom);
            const pctPasses = agg.totalApps > 0 ? ((agg.totalPasses / agg.totalApps) * 100).toFixed(0) + "%" : "—";
            return `<tr>
                <td class="career-cell-comp">${logo}${escapeHtml(nom)}</td>
                ${cellStat(agg.totalApps || "—")}
                ${cellStat(agg.totalButs || "—")}
                ${cellStat(agg.totalPasses || "—")}
                ${cellStat("—")}
                ${cellStat("—")}
                ${cellStat("—")}
                ${cellStat("—")}
                ${cellStat("—")}
                ${cellStat("—")}
                ${cellStat(pctPasses)}
                <td class="career-cell-note">${agg.noteMoy ? noteHtml(agg.noteMoy) : "—"}</td>
            </tr>`;
        }).join("");
        saisonHtml = `<div class="career-table-wrap"><table class="career-table"><thead><tr><th>Compétition</th><th>Apps</th><th>Buts</th><th>Passes décisives</th><th>xG</th><th>PdA</th><th>Pen.</th><th>HdM</th><th>Jaune</th><th>Rouge</th><th>% pas.</th><th>Note moy.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    let archivesHtml = "";
    if (rawData.erreur_historique_carriere) {
        archivesHtml = `<p role="alert">Lecture de l’historique impossible : ${escapeHtml(rawData.erreur_historique_carriere)}</p>`;
    } else if (!lignesArchives.length) {
        archivesHtml = "<p>Aucune ligne de carrière archivée disponible pour ce joueur dans la sauvegarde.</p>";
    } else {
        const rows = lignesArchives.map(ligne => {
            const clubLogo = logoLocalHtml("club", ligne.club_uid, ligne.club);
            const nationFlag = logoLocalHtml("nation", ligne.nation_uid, ligne.nation);
            const divisionLogo = logoLocalHtml("comp", ligne.division_uid, ligne.division);
            const note = typeof ligne.note === "number" && Number.isFinite(ligne.note)
                ? ligne.note.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
            return `<tr>
                <td class="career-cell-annee">${escapeHtml(ligne.annee ?? "—")}</td>
                <td class="career-cell-club">${clubLogo}${escapeHtml(ligne.club ?? "—")}</td>
                <td class="career-cell-infos">${escapeHtml(ligne.infos ?? "—")}</td>
                <td class="career-cell-nation">${nationFlag}${escapeHtml(ligne.nation ?? "—")}</td>
                <td class="career-cell-division">${divisionLogo}${escapeHtml(ligne.division ?? "—")}</td>
                ${cellStat(ligne.total_apparitions ?? "—")}
                ${cellStat(ligne.buts ?? "—")}
                ${cellStat(ligne.decisive ?? "—")}
                ${cellStat(ligne.hdm ?? "—")}
                <td class="career-cell-note">${escapeHtml(note)}</td>
            </tr>`;
        }).join("");
        archivesHtml = `<div class="career-table-wrap"><table class="career-table"><thead><tr><th>Année</th><th>Équipe</th><th>Infos</th><th>Nation</th><th>Division</th><th>Total app.</th><th>Buts</th><th>Déc.</th><th>HdM</th><th>Note moy.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    return `<section class="profile-section"><h3>Carrière du joueur</h3><p class="profile-disclaimer">Statistiques potentiellement incomplètes ; les zéros des archives ne garantissent pas l’absence d’événement. L’année archivée est indicative : son lien avec le début ou la fin de saison n’est pas confirmé. Les types, y compris le total, ne sont pas additionnés. Données FM27 à vérifier dans le jeu.</p><h4>Saison actuelle</h4>${saisonHtml}<h4>Saisons archivées</h4>${archivesHtml}</section>`;
}

function panneauCarriere(person, staff = false) {
    return `<section class="profile-tab-panel" id="profile-tab-career" role="tabpanel" aria-labelledby="career-tab-button"${profileActiveTab === "career" ? "" : " hidden"}>${renderCareerProfile(person, staff)}</section>`;
}

function profilPhysiqueJoueur(player) {
    const height = estNombre(player.taille_cm) && Number(player.taille_cm) > 0
        ? `${escapeHtml(player.taille_cm)} cm`
        : "non renseignée";
    return `<p class="profile-physical">Taille : ${height}</p>`;
}

function jaugePied(label, valeur) {
    const v = valeur == null ? null : Number(valeur);
    const width = v == null ? 0 : Math.max(0, Math.min(100, v / 20 * 100));
    const couleur = v == null ? "#39434c" : v >= 15 ? "#4ade80" : v >= 10 ? "#fbbf24" : "#f87171";
    const affiche = v == null ? "—" : String(v);
    let libelle = "";
    if (v != null) {
        if (v >= 18) libelle = "Très fort";
        else if (v >= 15) libelle = "Fort";
        else if (v >= 11) libelle = "Correct";
        else if (v >= 6) libelle = "Moyen";
        else libelle = "Faible";
    }
    return `<div class="pied-bloc"><div class="pied-titre">${escapeHtml(label)}</div><div class="pied-libelle">${libelle || "—"}</div><div class="pied-valeur">${escapeHtml(affiche)}</div><div class="profile-ability-track pied-track"><div class="profile-ability-fill pied-fill" style="width:${width}%;background:${couleur}"></div></div></div>`;
}

function capacitesPieds(player) {
    return `<div class="pied-capacites">${jaugePied("Pied gauche", player.left_foot)}${jaugePied("Pied droit", player.right_foot)}</div>`;
}

function renderPlayerProfile(player) {
    const stats = player.stats || {};
    const potentialStats = attributsPotentiels(player);
    const positions = positionsProfil(player);
    const suggestedPosition = positions.some(position => position.key === profilePosition)
        ? profilePosition
        : positionInitialeProfil(player);
    const roleChoices = rolesParPoste[suggestedPosition] || [];
    const defaultRole = roleChoices.includes(profileRole)
        ? profileRole
        : posteRoleTactique(player)?.roleId && roleChoices.includes(posteRoleTactique(player).roleId)
            ? posteRoleTactique(player).roleId
            : meilleurRole(player).roleId && roleChoices.includes(meilleurRole(player).roleId)
                ? meilleurRole(player).roleId
                : roleChoices[0]
        || "";
    const positionOptions = positions.map(position =>
        `<option value="${escapeHtml(position.key)}"${position.key === suggestedPosition ? " selected" : ""}>${escapeHtml(nomPoste(position.key))}</option>`
    ).join("");
    const roleOptions = roleChoices.map(roleId =>
        `<option value="${roleId}"${roleId === defaultRole ? " selected" : ""}>${escapeHtml(roles[roleId].nom)}</option>`
    ).join("");
    const value = player.valeur_marchande == null ? "—" : formatMoney(player.valeur_marchande);
    const wage = player.salaire_hebdomadaire == null ? "—" : `${formatMoney(player.salaire_hebdomadaire)} / sem.`;
    const natural = afficherPoste(player);
    const identity = `${player.age == null ? "" : `${escapeHtml(player.age)} ans`}${natural && natural !== "Non défini" ? ` · ${escapeHtml(natural)}` : ""}`;
    const searchablePosition = document.getElementById("poste-filter")?.value;
    const roleHint = searchablePosition && suggestedPosition === searchablePosition
        ? "Le poste sélectionné dans les filtres est mis en évidence."
        : "Le poste le mieux coté ou la position de votre tactique est mis en évidence.";
    const roleId = defaultRole;
    const highlighted = new Set(roles[roleId]?.stats || []);
    const currentAbility = Number(player.ca);
    const potentialAbility = Number(player.pa);
    const currentWidth = Number.isFinite(currentAbility) ? Math.max(0, Math.min(100, currentAbility / 2)) : 0;
    const potentialWidth = Number.isFinite(potentialAbility) ? Math.max(0, Math.min(100, potentialAbility / 2)) : 0;
    const benchmarkOptions = joueursComparaisonProfil(player);
    const automaticBenchmark = meilleurJoueurAuPoste(suggestedPosition, roles[roleId], player);
    const selectedBenchmark = profileComparisonPlayerIndex == null
        ? null
        : benchmarkOptions.find(option => option.index === profileComparisonPlayerIndex)?.player || null;
    const benchmark = selectedBenchmark || automaticBenchmark;
    const comparisonStats = benchmark ? benchmark.stats || {} : null;
    const selectedBenchmarkIndex = benchmark
        ? benchmarkOptions.find(option => option.player === benchmark)?.index
        : null;
    const benchmarkOptionsHtml = [
        `<option value=""${selectedBenchmarkIndex == null ? " selected" : ""}>${benchmarkOptions.length
            ? "Choisir un joueur de l’effectif"
            : "Aucun autre joueur de l’effectif"}</option>`,
        ...benchmarkOptions.map(option =>
            `<option value="${option.index}"${option.index === selectedBenchmarkIndex ? " selected" : ""}>${escapeHtml(option.player.nom || "Joueur")}${option.player.poste ? ` · ${escapeHtml(option.player.poste)}` : ""}</option>`
        )
    ].join("");
    const playerClub = (player.club_uid != null ? clubIndexById.get(String(player.club_uid)) : null)
        || clubIndexByName.get(player.club)
        || { name: player.club };
    const contractStatus = traduireStatutEffectif(player.statut_effectif || (player.sous_contrat === false ? "sans_contrat" : ""));
    const benchmarkSummary = `<span>Comparé à</span> <select id="profile-comparison-player" aria-label="Choisir le joueur de référence">${benchmarkOptionsHtml}</select><span>${benchmark ? "· valeurs affichées : joueur / référence" : "· sélectionnez un joueur pour comparer les attributs"}</span>`;
    const fieldAttributes = Object.entries(attributsParFamille).map(([family, keys]) => {
        const fieldKeys = keys.filter(key => !attributsGardien.includes(key));
        return `<section class="profile-section"><h3>${escapeHtml(family)}</h3>${fieldKeys.map(key => ligneAttributProfil(key, stats, highlighted, potentialStats, comparisonStats)).join("") || "<p class=\"profile-disclaimer\">Aucun attribut exporté.</p>"}</section>`;
    }).join("");
    const goalkeeperAttributes = attributsGardien
        .map(key => ligneAttributProfil(key, stats, highlighted, potentialStats, comparisonStats)).join("");
    return `<div class="profile-tabs">
        ${ongletsProfil()}
            <div class="profile-hero">
                <div class="profile-identity">
                    <div class="profile-person-heading">${portraitHtml(player, "profile-avatar")}<div><h2>${lienProfil("joueur", player.uid, player.nom || "Joueur", player.nom || "Joueur", true)}</h2><p>${identity || "Âge et poste non renseignés"}</p>${profilPhysiqueJoueur(player)}</div></div>
                    ${renduVisuelsProfil(playerClub, player, true)}
                    <div class="profile-contract-summary"><strong>Contrat</strong><span>Fin : ${escapeHtml(player.fin_contrat || "Non renseignée")}</span><span>Statut : ${escapeHtml(contractStatus || "Non renseigné")}</span>${player.en_pret ? `<span>Prêt depuis : ${linkClub(player.club_preteur)}</span>` : ""}</div>
                </div>
                <div class="profile-pieds">${capacitesPieds(player)}</div>
                <div class="profile-stats-col"><div class="profile-metric profile-ability-metric"><small>Capacité actuelle · CA</small><strong>${escapeHtml(player.ca ?? "—")}</strong><div class="profile-ability-track"><div class="profile-ability-fill current" style="width:${currentWidth}%"></div></div><div class="profile-potential-line"><span>Potentiel global · PA ${escapeHtml(player.pa ?? "—")}</span><div class="profile-ability-track"><div class="profile-ability-fill potential" style="width:${potentialWidth}%"></div></div></div></div><div class="profile-finances"><div class="profile-metric"><small>Valeur marchande</small><strong>${escapeHtml(value)}</strong></div><div class="profile-metric"><small>Salaire hebdomadaire</small><strong>${escapeHtml(wage)}</strong></div></div></div>
            </div>
        <section class="profile-tab-panel" id="profile-tab-profile" role="tabpanel" aria-labelledby="profile-tab-button"${profileActiveTab === "profile" ? "" : " hidden"}>
            <div class="profile-controls"><label>Poste recherché<select id="role-position">${positionOptions || "<option value=\"\">Poste non disponible</option>"}</select></label><label>Rôle évalué<select id="role-analyser">${roleOptions || "<option value=\"\">Rôle non disponible</option>"}</select></label></div>
            <p class="profile-disclaimer">${escapeHtml(roleHint)} · ${benchmark ? "Les attributs sont affichés actuel / joueur de référence." : "Les attributs sont affichés « actuel / potentiel »; le potentiel global (PA) est distinct du potentiel individuel."} L’export de cette sauvegarde ne contient pas les potentiels individuels, ils sont donc indiqués « — ».</p>
            <p class="profile-benchmark-summary">${benchmarkSummary}</p>
            <div class="profile-attribute-tabs" role="tablist" aria-label="Famille d’attributs du joueur">
                <button type="button" class="tab-btn${profileAttributeTab === "field" ? " active" : ""}" role="tab" aria-selected="${profileAttributeTab === "field"}" aria-controls="profile-attributes-field" data-profile-attribute-tab="field">Joueur de champ</button>
                <button type="button" class="tab-btn${profileAttributeTab === "goalkeeper" ? " active" : ""}" role="tab" aria-selected="${profileAttributeTab === "goalkeeper"}" aria-controls="profile-attributes-goalkeeper" data-profile-attribute-tab="goalkeeper">Gardien</button>
            </div>
            <div id="profile-attributes-field" class="profile-attribute-panel"${profileAttributeTab === "field" ? "" : " hidden"}><div class="profile-layout">${fieldAttributes}</div></div>
            <div id="profile-attributes-goalkeeper" class="profile-attribute-panel"${profileAttributeTab === "goalkeeper" ? "" : " hidden"}><div class="profile-layout"><section class="profile-section"><h3>Attributs gardien</h3>${goalkeeperAttributes || "<p class=\"profile-disclaimer\">Aucun attribut de gardien exporté.</p>"}</section></div></div>
            <div class="profile-layout">
                ${renderPositionPanel(player, suggestedPosition)}${renderRolePanel(player, suggestedPosition, roleId)}
            </div>
        </section>
        ${panneauCarriere(player)}
        <section class="profile-tab-panel" id="profile-tab-recruitment" role="tabpanel" aria-labelledby="recruitment-tab-button"${profileActiveTab === "recruitment" ? "" : " hidden"}></section>
    </div>`;
}

function renderStaffProfile(member) {
    const stats = member.stats || {};
    const allAttributes = blocAttributsProfil(stats, new Set(), attributsPotentiels(member));
    const ownStaff = rawData.staff.filter(person => person.est_mon_club && person.metier === member.metier);
    const benchmark = ownStaff.reduce((best, person) =>
        !best || Number(person.ca || 0) > Number(best.ca || 0) ? person : best, null);
    const comparison = benchmark
        ? `<section class="profile-section profile-contract"><h3>Comparaison · ${escapeHtml(traduireMetier(member.metier))}</h3><p>Meilleur CA du métier dans votre club : ${linkStaff(benchmark)} · ${escapeHtml(benchmark.ca ?? "—")}</p>${renderComparatifStaff(stats)}</section>`
        : `<section class="profile-section profile-contract"><h3>Comparaison · ${escapeHtml(traduireMetier(member.metier))}</h3><p>Aucun personnel de votre club avec ce métier à comparer.</p></section>`;
    const wage = member.salaire_hebdomadaire == null ? "—" : `${formatMoney(member.salaire_hebdomadaire)} / sem.`;
    const staffClub = (member.club_uid != null ? clubIndexById.get(String(member.club_uid)) : null)
        || clubIndexByName.get(member.club)
        || { name: member.club };
    return `<div class="profile-tabs">${ongletsProfil(true)}<section class="profile-tab-panel" id="profile-tab-profile" role="tabpanel" aria-labelledby="profile-tab-button"${profileActiveTab === "profile" ? "" : " hidden"}><div class="profile-hero"><div class="profile-identity"><div class="profile-person-heading">${portraitHtml(member, "profile-avatar")}<div><h2>${lienProfil("staff", member.uid, member.nom || "Membre du staff", member.nom || "Membre du staff", true)}</h2><p>${escapeHtml(traduireMetier(member.metier))}${member.age == null ? "" : ` · ${escapeHtml(member.age)} ans`}</p><p>Club : ${linkClub(member.club, member.club_uid)}</p></div></div></div><div class="profile-metric"><small>Capacité actuelle</small><strong>${escapeHtml(member.ca ?? "—")}</strong></div><div class="profile-metric"><small>Potentiel</small><strong>${escapeHtml(member.pa ?? "—")}</strong></div><div class="profile-metric"><small>Métier</small><strong>${escapeHtml(traduireMetier(member.metier))}</strong></div><div class="profile-metric"><small>Salaire hebdomadaire</small><strong>${escapeHtml(wage)}</strong></div></div>${renduVisuelsProfil(staffClub, member)}<h3>Attributs du staff</h3><p class="profile-disclaimer">L’extracteur actuel ne fournit que l’adaptabilité parmi les attributs métier FM27. Les autres attributs ne sont pas disponibles ; aucun chiffre n’est estimé. Les valeurs sont affichées actuel / potentiel individuel (— si inconnu).</p><div class="profile-layout">${allAttributes}<section class="profile-section"><h3>Compétences métier</h3><p>Entraînement, recrutement et compétences médicales : non disponibles dans l’export.</p></section></div><section class="profile-section profile-contract"><h3>Contrat</h3><div class="stat-row"><span>Fin du contrat</span><strong>${escapeHtml(member.fin_contrat || "Non renseignée")}</strong></div></section>${comparison}</section>${panneauCarriere(member, true)}</div>`;
}

function renderClubProfile(club) {
    const name = club.name || "Club";
    const detailedClub = (club.uid != null ? clubIndexById.get(String(club.uid)) : null)
        || clubIndexByName.get(name)
        || club;
    const players = rawData.joueurs.filter(player =>
        club.uid != null && player.club_uid != null
            ? String(player.club_uid) === String(club.uid)
            : player.club === name
    );
    const staff = rawData.staff.filter(member =>
        club.uid != null && member.club_uid != null
            ? String(member.club_uid) === String(club.uid)
            : member.club === name
    );
    const currentStanding = classementClubActuel(detailedClub);
    const best = modeDecouverte ? null : players.reduce((current, player) =>
        !current || Number(player.ca || 0) > Number(current.ca || 0) ? player : current, null);
    const average = !modeDecouverte && players.length
        ? Math.round(players.reduce((sum, player) => sum + Number(player.ca || 0), 0) / players.length)
        : null;
    return `<div class="profile-hero"><div class="profile-identity"><h2>${escapeHtml(name)}</h2><p>${club.uid != null && String(club.uid) === String(rawData.club_gere?.uid) ? "Club géré" : "Club repéré dans les données des joueurs"}</p></div><div class="profile-metric"><small>Joueurs trouvés</small><strong>${players.length}</strong></div><div class="profile-metric"><small>Staff trouvé</small><strong>${staff.length}</strong></div><div class="profile-metric"><small>CA moyen exporté</small><strong>${average ?? "—"}</strong></div><div class="profile-metric"><small>Réputation</small><strong>${escapeHtml(detailedClub.reputation ?? "—")}</strong></div></div>${renduVisuelsProfil(detailedClub)}<section class="profile-section"><h3>Classement actuel</h3><p>${currentStanding ? `${escapeHtml(currentStanding.position ?? "—")}${currentStanding.position === 1 ? "er" : currentStanding.position == null ? "" : "e"}${currentStanding.nombre_clubs ? ` / ${escapeHtml(currentStanding.nombre_clubs)}` : ""} · ${linkCompetition(currentStanding, detailedClub)}` : "Classement actuel non disponible dans les tables exportées."}</p><h3>Meilleur CA de l’effectif indexé</h3>${best ? `${linkJoueur(best)} · CA ${escapeHtml(best.ca ?? "—")} · ${escapeHtml(afficherPoste(best))}` : "Aucun joueur lié à ce club dans l’export."}<p class="profile-disclaimer">Les noms et images ne sont affichés que lorsqu’une correspondance est disponible.</p></section>`;
}

function groupesClassement(rows) {
    const groupes = new Map();
    for (const row of rows) {
        const tableId = row.standing.table_id;
        const size = row.standing.nombre_clubs;
        const key = tableId != null ? `table:${tableId}`
            : Number.isInteger(Number(size)) && Number(size) > 0 ? `taille:${size}` : "inconnue";
        if (!groupes.has(key)) groupes.set(key, []);
        groupes.get(key).push(row);
    }
    return [...groupes.entries()].map(([key, entries]) => {
        const positions = entries.map(row => row.standing.position).filter(value => value != null);
        const teams = entries.map(row => row.standing.equipe_id ?? `${row.club.uid}:${row.standing.equipe_slot ?? ""}`);
        const size = Number(entries[0].standing.nombre_clubs);
        const ambigu = key !== "table:" + entries[0].standing.table_id
            && (key === "inconnue"
                || new Set(positions.map(String)).size !== positions.length
                || new Set(teams.map(String)).size !== teams.length
                || entries.length > size);
        entries.sort((a, b) => ambigu
            ? String(a.club.name || "").localeCompare(String(b.club.name || ""), "fr")
            : (a.standing.position ?? Number.MAX_SAFE_INTEGER) - (b.standing.position ?? Number.MAX_SAFE_INTEGER)
                || String(a.club.name || "").localeCompare(String(b.club.name || ""), "fr"));
        return { entries, ambigu, taille: size, identifie: key.startsWith("table:") };
    }).sort((a, b) => (Number.isFinite(b.taille) ? b.taille : 0) - (Number.isFinite(a.taille) ? a.taille : 0));
}

function renderStatistiquesCompetition(rows, type) {
    const stats = rawData.statistiques_championnat_equipes;
    if (!Array.isArray(stats)) {
        return rawData.erreur_statistiques_saison
            ? `<p role="alert">Lecture des statistiques impossible : ${escapeHtml(rawData.erreur_statistiques_saison)}</p>`
            : "<p>Statistiques absentes de cette base. Réextrayez la sauvegarde avec la version à jour.</p>";
    }
    const equipes = new Map();
    for (const { club, standing } of rows) {
        if (standing.equipe_id != null) equipes.set(String(standing.equipe_id), { club, slot: standing.equipe_slot });
    }
    if (!equipes.size) return "<p>Aucune équipe identifiable dans les tables de cette compétition.</p>";
    const joueurs = new Map((rawData.joueurs || []).map(player => [String(player.uid), player]));
    const field = { buteurs: "goals", passeurs: "assists", notes: "average_rating" }[type];
    const lignes = stats.filter(row => row.team_id != null && equipes.has(String(row.team_id))
        && estNombre(row[field]) && (type === "notes"
            ? estNombre(row.rated_appearances) && Number(row.rated_appearances) > 0
            : Number(row[field]) > 0))
        .sort((a, b) => Number(b[field]) - Number(a[field])
            || String(a.player_name || "").localeCompare(String(b.player_name || ""), "fr"));
    const avertissement = `<p class="profile-disclaimer"><strong>Classement indicatif, pas un classement officiel de cette compétition.</strong> Statistiques de championnat de la saison pour les équipes retrouvées dans ses tables, toutes phases réunies ; elles ne sont pas liées à une compétition précise et ne représentent pas les statistiques de coupe. Les équipes ou joueurs peuvent manquer ; transferts et changements de division peuvent fausser le résultat. Un joueur ayant joué pour plusieurs équipes peut apparaître plusieurs fois sans addition de ses chiffres. Champs FM27 non confirmés : vérifiez dans le jeu.${type === "notes" ? " Aucun minimum de matchs notés : une note sur peu de matchs peut être trompeuse." : ""}</p>`;
    if (!lignes.length) return `${avertissement}<p>Aucune statistique correspondante disponible pour les équipes retrouvées.</p>`;
    const titre = { buteurs: "Buts", passeurs: "Passes décisives", notes: "Note moyenne" }[type];
    const contenu = lignes.map((row, index) => {
        const team = equipes.get(String(row.team_id));
        const player = row.player_uid == null ? null : joueurs.get(String(row.player_uid));
        const nom = player ? linkJoueur(player) : escapeHtml(row.player_name || "Joueur non associé");
        const club = linkClub(team.club.name || "Club non renseigné", team.club.uid)
            + (team.slot ? ` · équipe ${escapeHtml(team.slot)}` : "");
        const value = type === "notes" ? Number(row[field]).toFixed(2) : escapeHtml(row[field]);
        const matchs = type === "notes" ? row.rated_appearances
            : estNombre(row.starts) && estNombre(row.substitute_appearances)
                ? Number(row.starts) + Number(row.substitute_appearances) : "—";
        return `<tr><td>${index + 1}</td><td>${nom}</td><td>${club}</td><td>${escapeHtml(matchs)}</td><td>${value}</td></tr>`;
    }).join("");
    return `${avertissement}<p>${lignes.length} ligne(s) disponibles.</p><div class="competition-table-wrap"><table class="competition-table"><thead><tr><th>Rang</th><th>Joueur</th><th>Équipe</th><th>${type === "notes" ? "Matchs notés" : "Matchs"}</th><th>${titre}</th></tr></thead><tbody>${contenu}</tbody></table></div>`;
}

function renderCompetitionProfile(standing) {
    const key = cleCompetition(standing);
    const rows = (rawData.clubs || []).flatMap(club =>
        (club.classements || []).filter(item => cleCompetition(item) === key)
            .map(item => ({ club, standing: item }))
    );
    const groupes = groupesClassement(rows);
    const title = nomCompetition(standing) || "Compétition non disponible";
    const logo = logoLocalHtml("comp", standing.competition_uid, `Logo ${title}`);
    const mark = `<span class="profile-visual-mark profile-division-mark${logo ? " has-logo" : ""}" data-fallback="${escapeHtml(initialesVisuelles(title))}">${logo || escapeHtml(initialesVisuelles(title))}</span>`;
    const sections = groupes.map((group, index) => {
        const lignes = group.entries.map(({ club, standing: item }) => `<tr><td>${escapeHtml(item.position ?? "—")}</td><td>${linkClub(club.name || "Club non renseigné", club.uid)}${item.equipe_slot ? ` · équipe ${escapeHtml(item.equipe_slot)}` : ""}</td><td>${escapeHtml(item.matches_joues ?? "—")}</td><td>${escapeHtml(item.buts_marques ?? "—")}</td><td>${escapeHtml(item.buts_encaisses ?? "—")}</td><td>${escapeHtml(item.points ?? "—")}</td></tr>`).join("");
        const message = group.ambigu
            ? "Des groupes ou phases ne peuvent pas être séparés avec cette ancienne extraction : équipes listées par ordre alphabétique, sans classement global."
            : group.identifie
                ? "Table distincte de la sauvegarde ; la liste des équipes peut être incomplète."
                : "Regroupement par taille de table dans une ancienne extraction : séparation indicative, à confirmer après réextraction.";
        return `<section class="profile-section"><h3>Table ${index + 1}${Number.isFinite(group.taille) && group.taille > 0 ? ` · ${escapeHtml(group.taille)} équipes prévues` : ""}</h3><p class="profile-disclaimer">${message}</p><div class="competition-table-wrap"><table class="competition-table"><thead><tr><th>Rang</th><th>Club</th><th>Joués</th><th>Buts marqués</th><th>Buts encaissés</th><th>Points</th></tr></thead><tbody>${lignes}</tbody></table></div></section>`;
    }).join("");
    const teamsCount = new Set(rows.map(({ club, standing: item }) => String(item.equipe_id ?? `${club.uid}:${item.equipe_slot ?? ""}`))).size;
    const tabs = [["classement", "Classement"], ["buteurs", "Meilleurs buteurs"], ["passeurs", "Meilleurs passeurs"], ["notes", "Meilleures notes"]];
    const tabButtons = tabs.map(([id, label]) => `<button type="button" class="tab-btn${competitionActiveTab === id ? " active" : ""}" role="tab" id="competition-tab-${id}" aria-selected="${competitionActiveTab === id}" aria-controls="competition-panel-${id}" tabindex="${competitionActiveTab === id ? "0" : "-1"}" data-competition-tab="${id}">${label}</button>`).join("");
    const statistiques = tabs.slice(1).map(([id, label]) => `<section class="profile-section" id="competition-panel-${id}" role="tabpanel" aria-labelledby="competition-tab-${id}"${competitionActiveTab === id ? "" : " hidden"}><h3>${label}</h3>${renderStatistiquesCompetition(rows, id)}</section>`).join("");
    const oldData = rows.some(({ standing: item }) => item.buts_marques == null || item.buts_encaisses == null);
    return `<div class="profile-hero"><div class="profile-identity"><h2>${escapeHtml(title)}</h2><p>Nom issu des données ou corrections locales, non vérifié.</p></div>${mark}<div class="profile-metric"><small>Équipes distinctes retrouvées</small><strong>${teamsCount}</strong></div></div><div class="profile-tab-nav" role="tablist" aria-label="Sections de la compétition">${tabButtons}</div><div id="competition-panel-classement" role="tabpanel" aria-labelledby="competition-tab-classement"${competitionActiveTab === "classement" ? "" : " hidden"}><p class="profile-disclaimer">Les rangs, matchs, buts et points proviennent de la sauvegarde et peuvent concerner une coupe ou une autre phase. Les noms des phases ne sont pas disponibles.${oldData ? " Certaines données de buts sont absentes : réextrayez la sauvegarde avec la version à jour." : ""}</p>${sections || '<section class="profile-section">Aucune équipe disponible.</section>'}</div>${statistiques}`;
}

function refreshPop() {
    if (!entSel) return;
    const block = document.getElementById("modal-body");
    if (entSelMode === "competition") {
        block.innerHTML = renderCompetitionProfile(entSel);
        const tabs = [...block.querySelectorAll("[data-competition-tab]")];
        const activerOnglet = button => {
            competitionActiveTab = button.dataset.competitionTab;
            tabs.forEach(tab => {
                const active = tab.dataset.competitionTab === competitionActiveTab;
                tab.classList.toggle("active", active);
                tab.setAttribute("aria-selected", String(active));
                tab.tabIndex = active ? 0 : -1;
            });
            block.querySelectorAll('[role="tabpanel"]').forEach(panel => {
                panel.hidden = panel.id !== `competition-panel-${competitionActiveTab}`;
            });
        };
        tabs.forEach((button, index) => {
            button.addEventListener("click", () => activerOnglet(button));
            button.addEventListener("keydown", event => {
                let next;
                if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
                else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = tabs.length - 1;
                else return;
                event.preventDefault();
                activerOnglet(tabs[next]);
                tabs[next].focus();
            });
        });
        return;
    }
    if (entSelMode === "club") {
        block.innerHTML = renderClubProfile(entSel);
        return;
    }
    block.innerHTML = entSelMode === "staff" ? renderStaffProfile(entSel) : renderPlayerProfile(entSel);
    block.querySelectorAll("[data-profile-tab]").forEach(button => button.addEventListener("click", () => {
        profileActiveTab = button.dataset.profileTab;
        block.querySelectorAll("[data-profile-tab]").forEach(tab => {
            const active = tab.dataset.profileTab === profileActiveTab;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        block.querySelectorAll(".profile-tab-panel").forEach(panel => {
            panel.hidden = panel.id !== `profile-tab-${profileActiveTab}`;
        });
    }));
    if (entSelMode === "staff") return;
    const positionSelect = document.getElementById("role-position");
    const roleSelect = document.getElementById("role-analyser");
    const comparisonSelect = document.getElementById("profile-comparison-player");
    const profileTabNav = block.querySelector(".profile-tab-nav");
    profileTabNav.append(creerBoutonSuiviJoueur(entSel));
    const recruitmentPanel = document.getElementById("profile-tab-recruitment");
    recruitmentPanel.insertAdjacentHTML("beforeend", explicationRecrutement(entSel, positionSelect?.value, roleSelect?.value));
    recruitmentPanel.insertAdjacentHTML("beforeend", controlesPonderations(roleSelect?.value));
    brancherPonderations(roleSelect?.value);
    block.querySelectorAll("[data-profile-attribute-tab]").forEach(button => button.addEventListener("click", () => {
        profileAttributeTab = button.dataset.profileAttributeTab;
        block.querySelectorAll("[data-profile-attribute-tab]").forEach(tab => {
            const active = tab.dataset.profileAttributeTab === profileAttributeTab;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        block.querySelectorAll(".profile-attribute-panel").forEach(panel => {
            panel.hidden = panel.id !== `profile-attributes-${profileAttributeTab}`;
        });
    }));
    document.getElementById("find-similar")?.addEventListener("click", () => {
        ouvrirSimilaires(entSel, positionSelect.value, roleSelect.value);
    });
    positionSelect?.addEventListener("change", () => {
        profilePosition = positionSelect.value;
        profileRole = "";
        refreshPop();
    });
    block.querySelectorAll("[data-profile-position]").forEach(button => button.addEventListener("click", () => {
        profilePosition = button.dataset.profilePosition;
        profileRole = "";
        refreshPop();
        block.querySelector(`[data-profile-position="${profilePosition}"]`)?.focus();
    }));
    roleSelect?.addEventListener("change", () => {
        profileRole = roleSelect.value;
        refreshPop();
    });
    comparisonSelect?.addEventListener("change", () => {
        profileComparisonPlayerIndex = comparisonSelect.value === ""
            ? null
            : Number(comparisonSelect.value);
        refreshPop();
    });
}

function joueursComparaisonProfil(player) {
    return rawData.joueurs
        .map((candidate, index) => ({ player: candidate, index }))
        .filter(({ player: candidate }) => candidate !== player
            && (player.uid == null || String(candidate.uid) !== String(player.uid))
            && candidate.est_mon_club === true
            && candidate.stats && typeof candidate.stats === "object"
            && Object.values(candidate.stats).some(estNombre))
        .sort((a, b) => String(a.player.nom || "").localeCompare(String(b.player.nom || ""), "fr"));
}

function joueurAuPoste(player, position) {
    if (!position) return false;
    const rating = Number(player.positions?.[position]);
    if (Number.isFinite(rating) && rating > 1) return true;
    return [...(player.positions_naturelles || []), ...String(player.poste || "").split(/\s*\/\s*/)]
        .some(code => codePosteNom[String(code).toUpperCase()] === position
            || String(code).toLowerCase() === position);
}

function meilleurJoueurAuPoste(position, role, excludedPlayer = null) {
    if (!role || !position) return null;
    return rawData.joueurs
        .filter(player => player.est_mon_club === true
            && (excludedPlayer == null || player !== excludedPlayer
                && (excludedPlayer.uid == null || String(player.uid) !== String(excludedPlayer.uid)))
            && joueurAuPoste(player, position))
        .map(player => ({ player, score: noteRole(player, role, position) }))
        .filter(result => Number.isFinite(result.score))
        .sort((a, b) => b.score - a.score)[0]?.player || null;
}

function renderComparatifStaff(stats) {
    const targetJob = String(entSel.metier || "").trim().toLocaleLowerCase("fr");
    const benchmark = rawData.staff
        .filter(member => member.est_mon_club === true
            && String(member.metier || "").trim().toLocaleLowerCase("fr") === targetJob
            && member.ca != null
            && Number.isFinite(Number(member.ca)))
        .reduce((best, member) => !best || Number(member.ca) > Number(best.ca) ? member : best, null);
    const title = `Comparatif avec le meilleur staff : ${traduireMetier(entSel.metier)}`;
    if (!benchmark) {
        return `<hr style="border-color:#333;margin:10px 0;"><h3>${escapeHtml(title)}</h3><p>Aucun autre membre de votre staff avec ce métier n'est disponible pour le comparatif.</p>`;
    }
    let html = `<hr style="border-color:#333;margin:10px 0;"><h3>${escapeHtml(title)}</h3><p>${linkStaff(benchmark)} · CA ${escapeHtml(benchmark.ca)}</p>`;
    html += ligneComparaison("Capacité actuelle (CA)", entSel.ca, benchmark.ca);
    html += ligneComparaison("Potentiel (PA)", entSel.pa, benchmark.pa);
    const commonStats = Object.keys(stats || {}).filter(key =>
        estNombre(stats[key]) && estNombre(benchmark.stats?.[key])
    ).sort();
    if (!commonStats.length) {
        html += "<p>Aucun attribut professionnel commun n'est fourni par l'export pour comparer ces profils.</p>";
    } else {
        commonStats.forEach(key => {
            html += ligneComparaison(nomsStats[key] || key.replace(/_/g, " "), stats[key], benchmark.stats[key]);
        });
    }
    return html;
}

function ligneComparaison(label, value, benchmarkValue) {
    if (!estNombre(value) || !estNombre(benchmarkValue)) {
        return `<div class="stat-row comparison-row"><span>${escapeHtml(label)} :</span><span>Non disponible</span></div>`;
    }
    const current = Number(value);
    const reference = Number(benchmarkValue);
    if (!Number.isFinite(current) || !Number.isFinite(reference)) {
        return `<div class="stat-row comparison-row"><span>${escapeHtml(label)} :</span><span>Non disponible</span></div>`;
    }
    const difference = current - reference;
    const className = difference > 0 ? "comparison-better" : difference < 0 ? "comparison-worse" : "comparison-equal";
    const delta = difference > 0 ? `+${difference}` : String(difference);
    return `<div class="stat-row comparison-row ${className}"><span>${escapeHtml(label)} :</span><span>${escapeHtml(current)}/20 · ${escapeHtml(reference)}/20 · ${escapeHtml(delta)}</span></div>`;
}

function estNombre(value) {
    return value != null && value !== "" && Number.isFinite(Number(value));
}

function alimenterFiltresStaff() {
    const select = document.getElementById("staff-job-filter");
    const selected = select.value;
    const jobs = [...new Set(rawData.staff.map(person => person.metier).filter(Boolean))]
        .sort((a, b) => traduireMetier(a).localeCompare(traduireMetier(b), "fr"));
    select.replaceChildren(new Option("Tous les métiers", ""));
    jobs.forEach(job => select.add(new Option(traduireMetier(job), job)));
    if (jobs.includes(selected)) select.value = selected;
}

function moyenneAttributs(player, role) {
    const valeurs = role.stats
        .map(key => player.stats?.[key])
        .filter(value => value != null && value !== "")
        .map(Number)
        .filter(Number.isFinite);
    return valeurs.length ? valeurs.reduce((sum, value) => sum + value, 0) / valeurs.length : 0;
}

function meilleurRole(player) {
    const ratings = player.positions || {};
    let best = null;
    Object.entries(ratings).forEach(([position, rawRating]) => {
        const rating = Number(rawRating);
        const choices = rolesParPoste[position];
        if (!choices || !Number.isFinite(rating)) return;
        choices.forEach(roleId => {
            const role = roles[roleId];
            const attributes = moyenneAttributs(player, role);
            const score = rating * 0.7 + attributes * 0.3;
            if (!best || score > best.score) best = { position, roleId, label: `${nomPoste(position)} - ${role.nom}`, score };
        });
    });
    if (best && best.score > 0) return best;

    const codes = String(player.poste || "").split(/\s*\/\s*/);
    for (const code of codes) {
        const position = codePosteNom[code.toUpperCase()];
        const roleId = rolesParPoste[position]?.[0];
        if (roleId) {
            return {
                position,
                roleId,
                label: `${nomPoste(position)} - ${roles[roleId].nom}`,
                score: moyenneAttributs(player, roles[roleId])
            };
        }
    }
    return { position: "", roleId: Object.keys(roles)[0], label: "", score: 0 };
}

function posteRoleTactique(player) {
    const tactic = rawData.tactiques.find(item => item.id === document.getElementById("tactique-select").value);
    if (!tactic) return null;
    const ratings = player.positions || {};
    let best = null;
    (tactic.postes || []).forEach(slot => {
        const positions = slot.avec_ball?.length ? slot.avec_ball : slot.sans_ball || [];
        positions.forEach(position => {
            const positionCode = clePoste[position] || position;
            const rating = Number(ratings[positionCode]);
            const choices = rolesParPoste[positionCode] || [];
            if (!Number.isFinite(rating) || !choices.length) return;
            if (!best || rating > best.rating) {
                const roleId = tacticalRoles[tactic.id]?.[slot.numero] || choices[0];
                best = { position: positionCode, roleId, rating, slot: slot.numero };
            }
        });
    });
    return best && best.rating > 1 ? best : null;
}

function resumeRecrutement(player) {
    if (player.reputation == null || rawData.club_gere?.reputation == null) return null;
    const clubReputation = Number(rawData.club_gere?.reputation);
    const playerReputation = Number(player.reputation);
    if (!Number.isFinite(clubReputation) || !Number.isFinite(playerReputation)) return null;
    const margin = Number(document.getElementById("marge-reputation").value);
    if (playerReputation > clubReputation + margin) return null;

    const best = posteRoleTactique(player) || meilleurRole(player);
    const role = roles[best.roleId] || roles[Object.keys(roles)[0]];
    const roleScore = noteRole(player, role, best.position);
    if (!Number.isFinite(roleScore)) return null;
    const reputationScore = margin === 0
        ? 20
        : Math.max(0, 20 - Math.max(0, playerReputation - clubReputation) / margin * 20);
    const hasAbility = !modeDecouverte && estNombre(player.ca);
    const abilityScore = hasAbility ? Math.min(20, Math.max(0, Number(player.ca) / 10)) : null;
    const score = hasAbility ? reputationScore * 0.45 + roleScore * 0.35 + abilityScore * 0.2
        : (reputationScore * 0.45 + roleScore * 0.35) / 0.8;
    return {
        score,
        label: `${nomPoste(best.position)} - ${role.nom}`,
        position: best.position,
        roleId: best.roleId
    };
}

function ligneStat(key, value) {
    const label = nomsStats[key] || key.replace(/_/g, " ");
    const valid = value != null && Number.isFinite(Number(value));
    return `<div class="stat-row"><span>${escapeHtml(label)} :</span><span>${valid ? `${escapeHtml(value)}/20` : "Non disponible"}</span></div>`;
}

function fermerBulle() {
    document.getElementById("stat-modal").style.display = "none";
}

async function copierNomProfil(nom) {
    const status = document.getElementById("profile-copy-status");
    const afficherResultat = message => {
        status.textContent = message;
        status.hidden = false;
    };

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(nom);
            afficherResultat(`Nom copié : ${nom}`);
            return;
        }
    } catch (error) {
        if (!navigator.clipboard?.writeText) {
            afficherResultat(`Copie impossible : ${error instanceof Error ? error.message : String(error)}`);
            return;
        }
    }

    const textarea = document.createElement("textarea");
    textarea.value = nom;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
        if (!document.execCommand("copy")) {
            throw new Error("Le navigateur a refusé la copie.");
        }
        afficherResultat(`Nom copié : ${nom}`);
    } catch (error) {
        afficherResultat(`Copie impossible : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        textarea.remove();
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function traduireMetier(job) {
    const normalized = String(job || "").replace(/_/g, " ").trim().toLocaleLowerCase("fr");
    return metiersFrancais[normalized] || String(job || "Fonction non renseignée");
}

function clePosteDepuisNom(position) {
    const label = String(position || "").trim();
    if (!label) return "";
    const code = label.match(/\(([A-Z]{2,3})\)/)?.[1] || label.toUpperCase();
    if (codePosteNom[code]) return codePosteNom[code];
    const normalized = label.toLocaleLowerCase("en")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    return clePoste[normalized] || aliasPostesAnglais[normalized] || "";
}

function nomPoste(position) {
    const brut = String(position || "").toLowerCase();
    if (postes[brut]) return postes[brut];
    const normalized = clePosteDepuisNom(position);
    return postes[normalized] || String(position || "");
}

function afficherPoste(player) {
    const rawPositions = player.positions_naturelles?.length
        ? player.positions_naturelles
        : String(player.poste || "").split(/\s*\/\s*/);
    const names = [...new Set(rawPositions)].sort(comparerPostes).map(nomPoste).filter(Boolean);
    return names.length ? [...new Set(names)].join(" / ") : "Non défini";
}

function posteAbrege(player) {
    const positions = player.positions_naturelles?.length
        ? player.positions_naturelles
        : String(player.poste || "").split(/\s*\/\s*/);
    return [...new Set(positions.map(value => {
        const brut = String(value).toUpperCase();
        const code = codesPosteParAbreviation.get(brut);
        return codesPosteFrancais[code] || codesPosteFrancais[clePosteDepuisNom(value)] || nomPoste(value);
    }).filter(Boolean))].join(" / ") || "—";
}

function alimenterTactiques() {
    const select = document.getElementById("tactique-select");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = rawData.tactiques.length
        ? "Sélectionnez la tactique utilisée en jeu"
        : "Aucune tactique enregistrée dans le fichier";
    select.appendChild(placeholder);
    rawData.tactiques.forEach(tactic => {
        const option = document.createElement("option");
        option.value = tactic.id;
        const team = tactic.team_slot == null ? "" : ` — équipe ${Number(tactic.team_slot) + 1}`;
        option.textContent = `${tactic.nom}${team}${tactic.style ? ` (${tactic.style})` : ""}`;
        select.appendChild(option);
    });
    afficherTactiqueDetail();
}

function afficherTactique() {
    afficherTactiqueDetail();
    if (mode === "joueurs") filtrerTout();
}

function afficherTactiqueDetail() {
    const detail = document.getElementById("tactique-detail");
    const tacticId = document.getElementById("tactique-select").value;
    const tactic = rawData.tactiques.find(item => item.id === tacticId);
    chargerPositionFixes(tacticId);
    if (!tactic) {
        const build = rawData.version_jeu?.build;
        if (rawData.erreur_tactiques || rawData.erreur_selections) {
            const details = [
                rawData.erreur_tactiques && `Tactiques : ${rawData.erreur_tactiques}`,
                rawData.erreur_selections && `Compositions : ${rawData.erreur_selections}`
            ].filter(Boolean).join("\n\n");
            detail.innerHTML = `<p class="caveat" role="alert">La lecture des données tactiques${build ? ` du build FM27 ${escapeHtml(build)}` : ""} a échoué. Le reste de la sauvegarde reste disponible.</p><details><summary>Détail technique</summary><pre>${escapeHtml(details)}</pre></details>`;
            return;
        }
        detail.textContent = rawData.tactiques.length
            ? "La sauvegarde n'indique pas quelle tactique est active. Sélectionnez celle que vous utilisez."
            : "Extrayez les tactiques enregistrées avec le script pour les afficher ici.";
        return;
    }
    const perspectives = tacticalPitchMode === "les-deux"
        ? [{ key: "avec", title: "Avec le ballon" }, { key: "sans", title: "Sans le ballon" }]
        : [{ key: tacticalPitchMode === "sans" ? "sans" : tacticalPitchMode === "avec" ? "avec" : "combine", title: "" }];
    const groupsByPerspective = perspectives.map(perspective => ({
        ...perspective,
        groups: construireGroupesRecommandes(tactic, perspective.key)
    }));
    // Vérifier si les données avec/sans ballon sont identiques (problème connu FM27)
    let warningHtml = "";
    if (tactic.postes && tactic.postes.length > 0) {
        const samePositions = tactic.postes.every(slot => {
            const avec = JSON.stringify(slot.avec_ball || []);
            const sans = JSON.stringify(slot.sans_ball || []);
            return avec === sans;
        });
        if (samePositions) {
            warningHtml = `<p class="caveat" style="color:#f1c40f">⚠ Les positions "Avec ballon" et "Sans ballon" semblent identiques dans cette sauvegarde FM27. C'est une limitation connue de l'extraction pour certaines versions FM27. Les données en jeu peuvent différer.</p>`;
        }
    }
    const activeGroups = tacticalPitchMode === "combine"
        ? groupesTactiques(tactic, "avec")
        : groupsByPerspective[0].groups;
    const roleControls = [...activeGroups.values()].flatMap(group => group.slots.map(slot => {
        const position = group.position;
        const choices = rolesParPoste[position] || [];
        const selected = slot.roleId || choices[0];
        const options = choices.map(roleId =>
            `<option value="${roleId}"${roleId === selected ? " selected" : ""}>${escapeHtml(roles[roleId].nom)}</option>`
        ).join("");
        return `<label class="tactic-slot">${escapeHtml(nomPoste(position) || "Poste non reconnu")}<select data-slot="${escapeHtml(slot.numero)}">${options || '<option value="">Aucun rôle disponible</option>'}</select></label>`;
    })).join("");
    const modeButtons = [
        ["combine", "Vue combinée"],
        ["avec", "Avec le ballon"],
        ["sans", "Sans le ballon"],
        ["les-deux", "Les deux"]
    ].map(([value, label]) => `<button type="button" class="pitch-mode-button${tacticalPitchMode === value ? " active" : ""}" onclick="setTacticalPitchMode('${value}')">${label}</button>`).join("");
    const pitchesHtml = (() => {
        if (tacticalPitchMode === "les-deux") {
            // Mode "Les deux" : deux terrains côte à côte (Avec / Sans)
            return groupsByPerspective.map(perspective =>
                `<div style="flex:1;min-width:300px;max-width:100%;outline:2px solid #5b9bd5;background:rgba(91,155,213,0.1)">${perspective.title ? `<h3>${perspective.title}</h3>` : ""}${renduTerrain(perspective.groups, "recommandations")}</div>`
            ).join("");
        }
        if (tacticalPitchMode === "combine") {
            // Mode "Vue combinée" : deux terrains côte à côte (Avec ballon / Sans ballon)
            const avecGroups = construireGroupesRecommandes(tactic, "avec");
            const sansGroups = construireGroupesRecommandes(tactic, "sans");
            console.log("[Debug combine] avecGroups size:", avecGroups.size, "sansGroups size:", sansGroups.size);
            return `
                <div style="flex:1;min-width:300px;max-width:100%;outline:2px solid #2ecc71;background:rgba(46,204,113,0.1);overflow-x:auto"><h3>Avec le ballon</h3>${renduTerrain(avecGroups, "recommandations")}</div>
                <div style="flex:1;min-width:300px;max-width:100%;outline:2px solid #e74c3c;background:rgba(231,76,60,0.1);overflow-x:auto"><h3>Sans le ballon</h3>${renduTerrain(sansGroups, "recommandations")}</div>
            `;
        }
        // Modes "avec" ou "sans" : un seul terrain
        return groupsByPerspective.map(perspective =>
            `${perspective.title ? `<h3>${perspective.title}</h3>` : ""}${renduTerrain(perspective.groups, "recommandations")}`
        ).join("");
    })();
    detail.innerHTML = `<p><strong>${escapeHtml(tactic.nom)}</strong>${tactic.mentalite ? ` · Mentalité ${escapeHtml(tactic.mentalite)}` : ""}</p><p>Les joueurs libres retenus dépassent le meilleur joueur au poste ou, s’ils ont moins de 20 ans, le PA du meilleur U20. Chaque joueur n’est proposé qu’une fois et chaque poste affiche trois profils maximum.</p>${warningHtml}<div class="pitch-mode-controls" role="group" aria-label="Vue des positions tactiques">${modeButtons}</div><div style="display:flex;gap:16px;flex-wrap:wrap;width:100%;background:rgba(255,255,255,0.02);border:1px dashed #5b9bd5;padding:8px;border-radius:8px">${pitchesHtml}</div><h3>Rôles de la tactique</h3><div class="tactic-role-controls">${roleControls}</div><details style="margin-top:12px"><summary>Debug : données tactiques brutes</summary><pre style="background:#0c1925;padding:8px;max-height:300px;overflow:auto;font-size:10px">${escapeHtml(JSON.stringify(tactic.postes, null, 2))}</pre></details><div style="margin-top:16px;padding:10px;background:#0c1925;border-radius:6px;border:1px solid #2a3040"><h4 style="color:#5b9bd5;margin-top:0">Corriger les positions « Sans le ballon »</h4><p style="font-size:12px;color:#888;margin-bottom:10px">Certaines positions sans ballon sont indéterminées (unknown) dans votre sauvegarde FM27. Sélectionnez la position réelle pour chaque slot :</p><div id="tactic-position-fixes"></div><button type="button" onclick="appliquerPositionFixes('${escapeHtml(tacticId)}')" style="background:#2ecc71;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer">Appliquer et rafraîchir le terrain</button></div>`;
    detail.querySelectorAll("select[data-slot]").forEach(select => {
        select.addEventListener("change", () => {
            (tacticalRoles[tactic.id] || (tacticalRoles[tactic.id] = {}))[select.dataset.slot] = select.value;
            afficherTactiqueDetail();
            if (mode === "club") afficherMonClub();
            if (mode === "joueurs") filtrerTout();
        });
    });
    // Remplir l'éditeur de corrections de positions
    const fixesContainer = document.getElementById("tactic-position-fixes");
    if (fixesContainer && tactic.postes) {
        const positionsDisponibles = [
            ["gk", "Gardien"], ["dr", "DD"], ["dl", "DG"], ["dc", "DC"], ["dm", "MDF"], ["mdg", "MDG"], ["mdd", "MDD"],
            ["mc", "MC"], ["mcg", "MCG"], ["mcd", "MCD"], ["mr", "MD"], ["ml", "MG"],
            ["amr", "MOD"], ["aml", "MOG"], ["amc", "MOC"], ["stc", "BT"], ["btg", "BTG"], ["btd", "BTD"],
            ["wbr", "ALD"], ["wbl", "ALG"], ["sw", "Libero"]
        ];
        const fixesHtml = tactic.postes.map(slot => {
            const sansRaw = slot.sans_ball?.[0] || "";
            const estUnknown = sansRaw.toLowerCase() === "unknown" || !sansRaw;
            if (!estUnknown) return "";
            const actuelFix = (tacticPositionFixes[tactic.id] && tacticPositionFixes[tactic.id][slot.numero] && tacticPositionFixes[tactic.id][slot.numero].sans) || "";
            const optionsHtml = positionsDisponibles.map(([code, label]) =>
                `<option value="${code}"${code === actuelFix ? " selected" : ""}>${label}</option>`
            ).join("");
            return `
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin:4px 0">
                    <span style="min-width:60px;color:#888">Slot ${slot.numero}</span>
                    <select id="posfix-${tactic.id}-${slot.numero}" style="width:140px">${optionsHtml}</select>
                    <span style="color:#888">(actuel : avec=${slot.avec_ball?.[0] || "?"}, sans=${sansRaw || "?"})</span>
                </label>
            `;
        }).join("");
        if (fixesHtml) {
            fixesContainer.innerHTML = fixesHtml;
        } else {
            fixesContainer.innerHTML = `<p style="font-size:12px;color:#2ecc71">Toutes les positions sans ballon sont définies. Aucune correction nécessaire.</p>`;
        }
    }
}

function appliquerPositionFixes(tacticId) {
    const fixes = tacticPositionFixes[tacticId] || {};
    let modified = false;
    document.querySelectorAll(".posfix-select").forEach(select => {
        const match = select.id.match(/posfix-.*?-(\d+)-(avec|sans)$/);
        if (!match) return;
        const slotNumero = Number(match[1]);
        const perspective = match[2];
        const valeur = select.value || null;
        if (!fixes[slotNumero]) fixes[slotNumero] = {};
        if (fixes[slotNumero][perspective] !== valeur) {
            fixes[slotNumero][perspective] = valeur;
            modified = true;
        }
    });
    if (modified) {
        tacticPositionFixes[tacticId] = fixes;
        sauvegarderPositionFixes(tacticId);
        afficherTactiqueDetail();
        if (mode === "club" && clubActiveTab === "tactique") afficherMonClub();
    }
}

function noteRole(player, role, positionKey) {
    const stats = player.stats || {};
    const available = role.stats
        .map(key => ({ value: stats[key], weight: poidsRole(role, key) }))
        .filter(item => item.weight > 0 && item.value != null && item.value !== "" && Number.isFinite(Number(item.value)));
    if (available.length === 0) return NaN;
    const attributeScore = available.reduce((sum, item) => sum + Number(item.value) * item.weight, 0)
        / available.reduce((sum, item) => sum + item.weight, 0);
    const rawPosition = (player.positions || {})[clePoste[positionKey]];
    const positionScore = rawPosition == null || rawPosition === "" ? NaN : Number(rawPosition);
    return Number.isFinite(positionScore) ? attributeScore * 0.85 + positionScore * 0.15 : attributeScore;
}

configEnTetes();
chargerIndexVisages();
chargerNomsCompetitions();
// Afficher la version dans le footer
if (typeof APP_VERSION !== 'undefined') {
    const versionEl = document.getElementById('app-version-display');
    if (versionEl) versionEl.textContent = APP_VERSION;
}
// Afficher le compteur de téléchargements
async function chargerCompteurTelechargements() {
    const el = document.getElementById('download-count');
    if (!el) return;
    if (!window.pywebview?.api?.get_download_count) return;
    try {
        const res = await window.pywebview.api.get_download_count();
        if (res && res.success && typeof res.count === 'number') {
            el.textContent = new Intl.NumberFormat('fr-FR').format(res.count);
        }
    } catch (e) {
        console.warn('Compteur de téléchargements indisponible:', e);
    }
}
chargerCompteurTelechargements();
// App is free - optional donations welcome (handled by header link)
document.getElementById("save-player-filter").addEventListener("click", () => sauvegarderFiltre());
document.getElementById("discovery-mode").addEventListener("change", basculerDecouverte);
document.getElementById("club-colors-save").addEventListener("click", enregistrerCouleursClub);
document.getElementById("club-colors-reset").addEventListener("click", reinitialiserCouleursClub);

// --- Auto-update ---
async function checkForUpdate() {
    const debugEl = document.getElementById("update-debug");
    if (!window.pywebview?.api?.check_for_update) {
        if (debugEl) debugEl.textContent = "Update: API not available";
        return;
    }
    try {
        if (debugEl) debugEl.textContent = "Update: checking...";
        const result = await window.pywebview.api.check_for_update();
        if (debugEl) debugEl.textContent = `Update: ${result?.available ? 'v' + result.latest + ' available' : 'up to date'} (${result?.current || APP_VERSION})`;
        if (result?.available && result?.url) {
            const btn = document.getElementById("update-btn");
            if (btn) {
                btn.style.display = "inline-flex";
                btn.classList.add("pulse");
                btn.onclick = (e) => {
                    e.preventDefault();
                    installUpdate(result.url, result.latest, result.changelog);
                };
            }
        }
    } catch (e) {
        if (debugEl) debugEl.textContent = "Update: error - " + e.message;
        console.warn("Update check failed:", e);
    }
}

async function installUpdate(url, version, changelog) {
    const msg = `Une mise à jour (v${version}) est disponible.\n\n${changelog || ""}\n\nVoulez-vous la télécharger et l'installer maintenant ? L'application va redémarrer.`;
    if (!confirm(msg)) return;
    const btn = document.getElementById("update-btn");
    const originalHtml = btn.innerHTML;
    
    try {
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"/></svg><span id="update-progress">Téléchargement... 0%</span>`;
            btn.style.pointerEvents = "none";
            btn.classList.remove("pulse");
            btn.classList.add("updating");
        }
        
        // Polling pour la progression
        const progressSpan = document.getElementById("update-progress");
        let progress = 0;
        
        const downloadPromise = window.pywebview.api.download_and_install_update(url);
        
        // Simuler la progression pendant l'attente (le vrai téléchargement se fait en Python)
        while (true) {
            const result = await Promise.race([
                downloadPromise,
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
            if (result !== undefined) {
                // Téléchargement terminé
                break;
            }
            progress = Math.min(progress + Math.random() * 15, 90);
            if (progressSpan) progressSpan.textContent = `Téléchargement... ${Math.round(progress)}%`;
        }
        
        // Mettre à 100%
        if (progressSpan) progressSpan.textContent = `Téléchargement... 100%`;
        
        const result = await downloadPromise;
        if (!result?.success) {
            throw new Error(result?.error || "Échec du téléchargement");
        }
        
        // Succès
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Mise à jour prête !</span>`;
            btn.classList.remove("updating");
            btn.classList.add("update-done");
        }
        
        alert(`✅ Téléchargement terminé !\n\nL'installateur va se lancer, l'application va se fermer puis redémarrer automatiquement.\n\nSi l'application ne redémarre pas, relancez-la depuis le raccourci Bureau ou le menu Démarrer.`);
        
        // Lancer l'installateur puis fermer l'application
        await window.pywebview.api.run_installer_and_quit(result.installer_path);
        
    } catch (e) {
        alert("Erreur lors de la mise à jour : " + e.message);
        if (btn) {
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = "auto";
            btn.classList.remove("updating");
            btn.classList.add("pulse");
        }
    }
}

// Vérifier les mises à jour au démarrage (après un court délai)
setTimeout(checkForUpdate, 3000);

// Charger la configuration des dossiers au démarrage
chargerConfigDossiers();

// Vérifier aussi au focus (quand l'utilisateur revient sur l'app)
window.addEventListener("focus", () => {
    if (document.getElementById("update-btn")?.style.display === "none") {
        checkForUpdate();
    }
});
