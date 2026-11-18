"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "entrainement.js"), "utf8");

const ROLES = {
    gardien: { nom: "Gardien de but", stats: ["reflexes", "handling", "positioning"] },
    defenseur_central: { nom: "Défenseur central", stats: ["tackling", "marking", "positioning", "heading", "strength"] },
    milieu_recuperateur: { nom: "Milieu défensif", stats: ["tackling", "positioning", "work_rate", "stamina", "anticipation"] },
    milieu_central: { nom: "Milieu axial", stats: ["passing", "decisions", "work_rate", "stamina", "teamwork"] }
};

const ROLES_PAR_POSTE = {
    gk: ["gardien"],
    dr: ["defenseur_central"],
    dc: ["defenseur_central"],
    dl: ["defenseur_central"],
    dm: ["milieu_recuperateur"],
    mc: ["milieu_central"]
};

const TACTIQUE = {
    id: "9125-0",
    nom: "GenPress",
    postes: [
        { numero: 0, avec_ball: ["gk"], sans_ball: ["gk"] },
        { numero: 1, avec_ball: ["dr"], sans_ball: ["dr"] },
        { numero: 2, avec_ball: ["dc"], sans_ball: ["dc"] },
        { numero: 3, avec_ball: ["dc"], sans_ball: ["dc"] },
        { numero: 4, avec_ball: ["dl"], sans_ball: ["dl"] },
        { numero: 5, avec_ball: ["mc"], sans_ball: ["dm"] },
        { numero: 6, avec_ball: ["mc"], sans_ball: ["mc"] }
    ]
};

const TACTIQUE_MONO = {
    id: "mono",
    nom: "Mono",
    postes: [{ numero: 5, avec_ball: ["mc"], sans_ball: ["dm"] }]
};

const STATS = {
    passing: 12, decisions: 11, work_rate: 14, stamina: 13, teamwork: 12,
    positioning: 10, marking: 8, tackling: 7, anticipation: 9, concentration: 10,
    heading: 6, strength: 8, reflexes: 3, handling: 2,
    first_touch: 12, technique: 11, composure: 10, vision: 10, flair: 7, aggression: 4
};

const JOUEUR = {
    uid: 1,
    nom: "Test Milieu",
    est_mon_club: true,
    age: 20,
    ca: 80,
    pa: 120,
    positions: { gk: 1, dr: 1, dc: 5, dl: 1, dm: 15, mc: 20 },
    stats: STATS,
    personnalite: { professionalism: 16 },
    blessures: []
};

function contexte() {
    const ctx = {
        console,
        noteRole: (joueur, role, position) => {
            const valeurs = role.stats.map(cle => Number(joueur.stats[cle])).filter(Number.isFinite);
            const attributs = valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length;
            const positionJoueur = Number(joueur.positions[position]);
            return Number.isFinite(positionJoueur) ? attributs * 0.85 + positionJoueur * 0.15 : attributs;
        },
        roles: ROLES,
        rolesParPoste: ROLES_PAR_POSTE
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    const module = ctx.AssistantFMEntrainement;
    module.noteRole = ctx.noteRole;
    return module;
}

test("le catalogue des focus couvre les cinq familles FM27 sans doublon", () => {
    const module = contexte();
    assert.equal(module.FOCUS_ENTRAINEMENT.length, 24);
    assert.equal(new Set(module.FOCUS_ENTRAINEMENT.map(focus => focus.id)).size, 24);
    assert.deepEqual([...module.CATEGORIES], ["Physique", "Attaque & Création", "Possession & Technique", "Défense & Pressing", "Coups de pied arrêtés"]);
    module.FOCUS_ENTRAINEMENT.forEach(focus => {
        assert.ok(focus.attributs.length >= 2, `${focus.id} doit cibler au moins deux attributs`);
    });
    assert.deepEqual([...module.FOCUS_PAR_ID.get("pressing").attributs], ["aggression", "work_rate", "stamina", "anticipation", "decisions"]);
});

test("scoreFocus moyenne les attributs disponibles et ignore les inconnus", () => {
    const module = contexte();
    const passes = module.scoreFocus(JOUEUR, module.FOCUS_PAR_ID.get("passes"));
    assert.equal(passes.id, "passes");
    assert.deepEqual([...passes.valeurs.map(item => item.cle)], ["passing", "vision", "technique"]);
    assert.deepEqual([...passes.manquants], []);
    assert.equal(passes.moyenne, 11);
    const coupsFrancs = module.scoreFocus(JOUEUR, module.FOCUS_PAR_ID.get("coups_francs"));
    assert.deepEqual([...coupsFrancs.valeurs.map(item => item.cle)], ["technique"]);
    assert.deepEqual([...coupsFrancs.manquants], ["free_kick_taking", "long_shots", "crossing"]);
    assert.equal(module.scoreFocus(JOUEUR, null), null);
});

test("choisirRole retient le meilleur poste compatible, pas un poste à 1", () => {
    const module = contexte();
    const avec = module.choisirRole(JOUEUR, TACTIQUE, "avec", {}, ROLES, ROLES_PAR_POSTE, module.noteRole, {});
    assert.ok(avec, "un rôle doit être trouvé");
    assert.equal(avec.position, "mc");
    assert.equal(avec.role.nom, "Milieu axial");
    assert.ok(avec.score > 0);
    const mono = module.choisirRole(JOUEUR, TACTIQUE_MONO, "sans", {}, ROLES, ROLES_PAR_POSTE, module.noteRole, {});
    assert.equal(mono.position, "dm", "la phase sans ballon utilise le code sans_ball du slot");
    assert.equal(mono.role.nom, "Milieu défensif");
});

test("une affectation manuelle de la tactique est prioritaire", () => {
    const module = contexte();
    const slot = module.choisirRole(JOUEUR, TACTIQUE, "avec", {}, ROLES, ROLES_PAR_POSTE, module.noteRole, { 2: 1 });
    assert.equal(slot.slot, 2);
    assert.equal(slot.position, "dc");
    assert.equal(slot.manuel, true);
    const sansManuel = module.choisirRole(JOUEUR, TACTIQUE, "sans", {}, ROLES, ROLES_PAR_POSTE, module.noteRole, { 2: 1 });
    assert.equal(sansManuel.position, "dc", "l’affectation manuelle s’applique aussi à la phase sans ballon");
});

test("priorites ne retient qu’un seul focus par défaut", () => {
    const module = contexte();
    const cibles = [{ role: ROLES.milieu_central, position: "mc" }, { role: ROLES.milieu_recuperateur, position: "dm" }];
    const defaut = module.priorites(JOUEUR, cibles);
    assert.equal(defaut.length, 1);
    assert.equal(defaut[0].id, "pressing");
    assert.ok(defaut[0].communs.length >= 2);
    assert.equal(module.priorites(JOUEUR, cibles, 2).length, 2);
    assert.equal(module.priorites(JOUEUR, [], 1).length, 0);
    assert.equal(module.priorites(JOUEUR, [{ role: { stats: ["reflexes"] } }], 1).length, 0);
});

test("intensiteEntrainement suit l’âge, la marge de progression, la fragilité et la blessure", () => {
    const module = contexte();
    assert.equal(module.intensiteEntrainement(JOUEUR).niveau, "Intense");
    assert.equal(module.intensiteEntrainement({ ...JOUEUR, age: 35, pa: 85 }).niveau, "Légère");
    assert.equal(module.intensiteEntrainement({ ...JOUEUR, blessures: [{ nom: "Ischios" }] }).niveau, "Légère");
    assert.equal(module.intensiteEntrainement({ ...JOUEUR, stats: { ...STATS, injury_proneness: 18 } }).niveau, "Légère");
    const sobre = module.intensiteEntrainement({ ...JOUEUR, age: 27, pa: 82, personnalite: { professionalism: 8 }, stats: { ...STATS, injury_proneness: 5 } });
    assert.equal(sobre.niveau, "Normale");
    assert.equal(module.intensiteEntrainement({ ...JOUEUR, age: 27, pa: 82, personnalite: { professionalism: 16 }, stats: { ...STATS, injury_proneness: 5 } }).niveau, "Intense");
});

test("planPourJoueur et planGlobal agrègent rôles, priorités et intensité", () => {
    const module = contexte();
    const plan = module.planPourJoueur(JOUEUR, TACTIQUE_MONO, { roles: ROLES, rolesParPoste: ROLES_PAR_POSTE, noteRole: module.noteRole });
    assert.equal(plan.avec.role.nom, "Milieu axial");
    assert.equal(plan.sans.role.nom, "Milieu défensif");
    assert.ok(plan.priorites.length > 0);
    assert.equal(plan.intensite.niveau, "Intense");
    const autre = { ...JOUEUR, uid: 2, nom: "Test Defenseur", age: 36, positions: { dc: 20 }, pa: 80 };
    const summary = module.planGlobal([JOUEUR, autre], TACTIQUE_MONO, { roles: ROLES, rolesParPoste: ROLES_PAR_POSTE, noteRole: module.noteRole });
    assert.equal(summary.total, 2);
    assert.equal(summary.couverts, 2);
    assert.ok(summary.focusPlusUrgeants.length > 0);
    const intense = summary.parNiveau.find(item => item.niveau === "Intense");
    const legere = summary.parNiveau.find(item => item.niveau === "Légère");
    assert.equal(intense.joueurs.length, 1);
    assert.equal(legere.joueurs.length, 1);
});

test("csvPlan produit un fichier exploitable avec les deux rôles et les priorités", () => {
    const module = contexte();
    const summary = module.planGlobal([JOUEUR], TACTIQUE_MONO, { roles: ROLES, rolesParPoste: ROLES_PAR_POSTE, noteRole: module.noteRole });
    const csv = module.csvPlan(summary, { nomsStats: { passing: "Passes", tackling: "Tacles" }, nomPoste: position => position.toUpperCase() });
    const lignes = csv.split("\r\n");
    assert.equal(lignes[0], '"Joueur";"Poste";"Rôle avec ballon (ALB)";"Rôle sans ballon (SLB)";"Priorité";"Intensité";"Justification"');
    assert.equal(lignes.length, 2);
    assert.ok(lignes[1].includes("Test Milieu"));
    assert.ok(lignes[1].includes("Milieu axial"));
    assert.ok(lignes[1].includes("Milieu défensif"));
    assert.ok(lignes[1].includes("Intense"));
});

test("aucune tactique ne casse le calcul", () => {
    const module = contexte();
    const summary = module.planGlobal([JOUEUR], null, { roles: ROLES, rolesParPoste: ROLES_PAR_POSTE, noteRole: module.noteRole });
    assert.equal(summary.couverts, 0);
    assert.equal(summary.plans[0].aDesRoles, false);
    assert.equal(summary.plans[0].priorites.length, 0);
});

const SOURCE_APP = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

function extraireFonctionApp(nom) {
    const debut = SOURCE_APP.indexOf(`function ${nom}(`);
    if (debut === -1) throw new Error(`Fonction app.js introuvable : ${nom}`);
    let profondeur = 0;
    const i = SOURCE_APP.indexOf("{", debut);
    for (let j = i; j < SOURCE_APP.length; j++) {
        if (SOURCE_APP[j] === "{") profondeur++;
        else if (SOURCE_APP[j] === "}") {
            profondeur--;
            if (profondeur === 0) return SOURCE_APP.slice(debut, j + 1);
        }
    }
    throw new Error(`Accolades : ${nom}`);
}

function rendreVue() {
    const panneau = {
        innerHTML: "",
        querySelector: () => null,
        querySelectorAll: () => []
    };
    const ctx = {
        console,
        rawData: { joueurs: [JOUEUR], tactiques: [TACTIQUE_MONO] },
        roles: ROLES,
        rolesParPoste: ROLES_PAR_POSTE,
        noteRole: (joueur, role, position) => {
            const valeurs = role.stats.map(cle => Number(joueur.stats[cle])).filter(Number.isFinite);
            const attributs = valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length;
            const positionJoueur = Number(joueur.positions[position]);
            return Number.isFinite(positionJoueur) ? attributs * 0.85 + positionJoueur * 0.15 : attributs;
        },
        tacticalRoles: {},
        tacticJoueurAffectes: {},
        nomsStats: { passing: "Passes", pressing: "Pressing" },
        nomPoste: position => String(position || "").toUpperCase(),
        linkJoueur: joueur => `<a>${joueur.nom}</a>`,
        escapeHtml: valeur => String(valeur == null ? "" : valeur),
        entrainementTacticId: "",
        document: { getElementById: id => (id === "entrainement-view" ? panneau : null) },
        navigator: { clipboard: { writeText: async () => {} } }
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    vm.runInContext("var entrainementSort = entrainementSort || \"priorite\";", ctx);
    vm.runInContext(extraireFonctionApp("codePosteEntrainement"), ctx);
    vm.runInContext(extraireFonctionApp("trierPlansEntrainement"), ctx);
    vm.runInContext(extraireFonctionApp("afficherEntrainement"), ctx);
    ctx.afficherEntrainement();
    return panneau.innerHTML;
}

test("la vue d’entraînement affiche les rôles ALB/SLB, les priorités et l’intensité", () => {
    const html = rendreVue();
    assert.match(html, /Entraînement individuel/);
    assert.match(html, /Rôle avec ballon \(ALB\)/);
    assert.match(html, /Rôle sans ballon \(SLB\)/);
    assert.match(html, /Pressing/);
    assert.match(html, /Intense/);
    assert.match(html, /Mono/);
    assert.match(html, /Test Milieu/);
    assert.match(html, /Trier par/);
    assert.match(html, /Nom de famille \(A → Z\)/);
    assert.match(html, /Poste \(Gardien → Attaquant\)/);
    assert.doesNotMatch(html, /undefined/);
});

test("trierPlansEntrainement range par nom, poste, âge et intensité sans modifier la source", () => {
    const ctx = {
        ORDRE_INTENSITE: { "légère": 0, "normale": 1, "intense": 2 },
        nomPoste: position => ({ stc: "Buteur", dc: "Défenseur central", mc: "Milieu central" }[position] || String(position || ""))
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(extraireFonctionApp("codePosteEntrainement"), ctx);
    vm.runInContext(extraireFonctionApp("trierPlansEntrainement"), ctx);
    const plans = [
        { joueur: { nom: "Zoé", poste: "stc", age: 22 }, priorites: [], intensite: { niveau: "Normale" } },
        { joueur: { nom: "Amine", poste: "dc", age: 30 }, priorites: [], intensite: { niveau: "Intense" } },
        { joueur: { nom: "Léo", poste: "mc", age: 19 }, priorites: [], intensite: { niveau: "Légère" } }
    ];
    const noms = liste => JSON.stringify(liste.map(item => item.joueur.nom));
    const attendu = liste => JSON.stringify(liste);
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "nom_asc")), attendu(["Amine", "Léo", "Zoé"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "nom_desc")), attendu(["Zoé", "Léo", "Amine"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "poste_asc")), attendu(["Amine", "Léo", "Zoé"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "poste_desc")), attendu(["Zoé", "Léo", "Amine"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "age_asc")), attendu(["Léo", "Zoé", "Amine"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "age_desc")), attendu(["Amine", "Zoé", "Léo"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "intensite_desc")), attendu(["Amine", "Zoé", "Léo"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "priorite")), attendu(["Zoé", "Amine", "Léo"]));
    assert.notEqual(ctx.trierPlansEntrainement(plans, "priorite"), plans);
});

test("la vue reste lisible sans tactique enregistrée", () => {
    const panneau = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
    const ctx = {
        console,
        rawData: { joueurs: [JOUEUR], tactiques: [] },
        roles: ROLES,
        rolesParPoste: ROLES_PAR_POSTE,
        noteRole: () => NaN,
        tacticalRoles: {},
        tacticJoueurAffectes: {},
        nomsStats: {},
        nomPoste: position => String(position || ""),
        linkJoueur: joueur => joueur.nom,
        escapeHtml: valeur => String(valeur == null ? "" : valeur),
        entrainementTacticId: "",
        document: { getElementById: id => (id === "entrainement-view" ? panneau : null) }
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    ctx.AssistantFMEntrainement = ctx.AssistantFMEntrainement;
    vm.runInContext("var entrainementSort = entrainementSort || \"priorite\";", ctx);
    vm.runInContext(extraireFonctionApp("codePosteEntrainement"), ctx);
    vm.runInContext(extraireFonctionApp("trierPlansEntrainement"), ctx);
    vm.runInContext(extraireFonctionApp("afficherEntrainement"), ctx);
    ctx.afficherEntrainement();
    assert.match(panneau.innerHTML, /Aucune tactique n’est enregistrée/);
});


function contexteTri() {
    const ctx = { ORDRE_INTENSITE: { "légère": 0, "normale": 1, "intense": 2 }, nomPoste: position => String(position || "") };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(extraireFonctionApp("codePosteEntrainement"), ctx);
    vm.runInContext(extraireFonctionApp("trierPlansEntrainement"), ctx);
    return ctx;
}

test("le tri par nom suit le nom de famille, particules comprises", () => {
    const ctx = contexteTri();
    const plans = [
        { joueur: { nom: "Amine Diallo", poste: "stc" }, priorites: [], intensite: { niveau: "Normale" } },
        { joueur: { nom: "Zoé Martin", poste: "gk" }, priorites: [], intensite: { niveau: "Normale" } },
        { joueur: { nom: "Léo Bernard", poste: "mc" }, priorites: [], intensite: { niveau: "Normale" } },
        { joueur: { nom: "Marco van Dijk", poste: "dc" }, priorites: [], intensite: { niveau: "Normale" } },
        { joueur: { nom: "Émile Núñez", poste: "amr" }, priorites: [], intensite: { niveau: "Normale" } }
    ];
    const noms = liste => JSON.stringify(liste.map(item => item.joueur.nom));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "nom_asc")),
        JSON.stringify(["Léo Bernard", "Amine Diallo", "Zoé Martin", "Émile Núñez", "Marco van Dijk"]));
    assert.equal(noms(ctx.trierPlansEntrainement(plans, "nom_desc")),
        JSON.stringify(["Marco van Dijk", "Émile Núñez", "Zoé Martin", "Amine Diallo", "Léo Bernard"]));
});

test("le tri par poste suit exactement l’ordre Gardien → Attaquant", () => {
    const ctx = contexteTri();
    const codes = ["stc", "btd", "btg", "amr", "amc", "aml", "mr", "mcd", "mcg", "mc", "ml",
        "mdd", "mdg", "dm", "wbr", "dr", "wbl", "dl", "dcd", "dcg", "dc", "sw", "gk"];
    const plans = codes.map((code, index) => ({
        joueur: { nom: "Joueur" + String(index).padStart(2, "0"), poste: code },
        priorites: [],
        intensite: { niveau: "Normale" }
    }));
    const tries = [...ctx.trierPlansEntrainement(plans, "poste_asc")].map(item => item.joueur.poste);
    assert.deepEqual(tries, ["gk", "sw", "dc", "dcg", "dcd", "dl", "wbl", "dr", "wbr",
        "dm", "mdg", "mdd", "ml", "mc", "mcg", "mcd", "mr", "aml", "amc", "amr",
        "stc", "btg", "btd"]);
    const inverse = [...ctx.trierPlansEntrainement(plans, "poste_desc")].map(item => item.joueur.poste);
    assert.deepEqual(inverse, ["btd", "btg", "stc", "amr", "amc", "aml", "mr", "mcd", "mcg",
        "mc", "ml", "mdd", "mdg", "dm", "wbr", "dr", "wbl", "dl", "dcd", "dcg", "dc", "sw", "gk"]);
});
