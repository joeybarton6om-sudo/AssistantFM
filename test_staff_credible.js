"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

const FONCTIONS = [
    "estMetierBackroom",
    "contratStaff",
    "finContratLisible",
    "appliquerTriStaff",
    "statistiquesValeurs",
    "percentileValeur",
    "porteeStaff",
    "dansPortee",
    "porteeEffective",
    "niveauComparable",
    "intitulePortee",
    "classementClubActuel",
    "afficherEvaluationStaff"
];

function extraireFonction(code, nom) {
    const debut = code.indexOf(`function ${nom}(`);
    if (debut === -1) throw new Error(`Fonction introuvable : ${nom}`);
    let profondeur = 0;
    let i = code.indexOf("{", debut);
    const depart = i;
    for (; i < code.length; i++) {
        if (code[i] === "{") profondeur++;
        else if (code[i] === "}") {
            profondeur--;
            if (profondeur === 0) return code.slice(debut, i + 1);
        }
    }
    throw new Error(`Accolades déséquilibrées pour ${nom} (départ ${depart})`);
}

const code = FONCTIONS.map(nom => extraireFonction(source, nom)).join("\n\n");

const CLUBS = [
    { uid: 1, name: "South Shields", nation_id: 765, classements: [{ competition_uid: 500, competition_nom: "National League North", equipe_slot: 0, matches_joues: 46 }] },
    { uid: 2, name: "FC United", nation_id: 765, classements: [{ competition_uid: 500, competition_nom: "National League North", equipe_slot: 0, matches_joues: 46 }] },
    { uid: 3, name: "Altrincham", nation_id: 765, classements: [{ competition_uid: 500, competition_nom: "National League North", equipe_slot: 0, matches_joues: 46 }] },
    { uid: 4, name: "Real Test", nation_id: 11, classements: [{ competition_uid: 900, competition_nom: "Division d’ailleurs", equipe_slot: 0, matches_joues: 38 }] }
];

const STAFF = [
    { uid: 101, nom: "Mon entraîneur", metier: "Coach", ca: 70, pa: 80, age: 41, club_uid: 1, nation_id: 765, fin_contrat: "2027-06-30", salaire_hebdomadaire: 900, est_mon_club: true },
    { uid: 102, nom: "Mon physio", metier: "Physio", ca: 96, pa: 96, age: 38, club_uid: 1, nation_id: 765, fin_contrat: "2028-06-30", salaire_hebdomadaire: 700, est_mon_club: true },
    { uid: 201, nom: "Coach A", metier: "Coach", ca: 40, pa: 60, age: 33, club_uid: 2, nation_id: 765, fin_contrat: "2026-12-31", salaire_hebdomadaire: 500, est_mon_club: false },
    { uid: 202, nom: "Coach B", metier: "Coach", ca: 50, pa: 60, age: 45, club_uid: 2, nation_id: 765, fin_contrat: null, salaire_hebdomadaire: 600, est_mon_club: false },
    { uid: 203, nom: "Coach C", metier: "Coach", ca: 60, pa: 70, age: 52, club_uid: 3, nation_id: 765, fin_contrat: "2027-01-15", salaire_hebdomadaire: 650, est_mon_club: false },
    { uid: 204, nom: "Coach D", metier: "Coach", ca: 80, pa: 85, age: 36, club_uid: 3, nation_id: 765, fin_contrat: "2029-06-30", salaire_hebdomadaire: 1200, est_mon_club: false },
    { uid: 205, nom: "Coach E", metier: "Coach", ca: 90, pa: 90, age: 29, club_uid: 3, nation_id: 765, fin_contrat: "2028-06-30", salaire_hebdomadaire: 1400, est_mon_club: false },
    { uid: 301, nom: "Star mondiale", metier: "Coach", ca: 199, pa: 200, age: 50, club_uid: 4, nation_id: 11, fin_contrat: "2030-06-30", salaire_hebdomadaire: 90000, est_mon_club: false },
    { uid: 302, nom: "Physio anglais", metier: "Physio", ca: 120, pa: 120, age: 44, club_uid: 4, nation_id: 11, fin_contrat: "2029-06-30", salaire_hebdomadaire: 3000, est_mon_club: false }
];

function contexte() {
    const ctx = {
        rawData: { joueurs: [], staff: STAFF.slice(), clubs: CLUBS.slice(), club_gere: { uid: 1, name: "South Shields", nation_id: 765 } },
        clubIndexById: new Map(CLUBS.map(club => [String(club.uid), club])),
        clubIndexByName: new Map(CLUBS.map(club => [String(club.name), club])),
        competitionNames: new Map([["500", "National League North"], ["900", "Division d’ailleurs"]]),
        staffScope: "division",
        staffSort: "",
        staffOverviewTab: "recommendations",
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        formatMoney: value => value == null ? "—" : `${value} €`,
        escapeHtml: value => String(value ?? ""),
        traduireMetier: value => value || "—",
        lienStaff: null,
        linkStaff: member => `<a>${member?.nom ?? "?"}</a>`,
        linkCompetition: () => "National League North",
        clubPourPersonne: personne => ctx.clubIndexById.get(String(personne?.club_uid)) || null,
        nomCompetition: classement => classement?.competition_nom || "",
        console
    };
    const panneau = {
        innerHTML: "",
        addEventListener: () => {},
        querySelector: () => ({ addEventListener: () => {} }),
        querySelectorAll: () => []
    };
    ctx.document = {
        getElementById: id => (id === "staff-overview" ? panneau : null),
        querySelector: () => null,
        querySelectorAll: () => []
    };
    ctx.globalThis = ctx;
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    return { ctx, panneau };
}

function rendre(ctx) {
    ctx.afficherEvaluationStaff();
    return ctx.document.getElementById("staff-overview").innerHTML;
}

test("contratStaff distingue les contrats en cours et les profils libres", () => {
    const { ctx } = contexte();
    assert.equal(ctx.contratStaff({ fin_contrat: "2027-06-30" }), "sous_contrat");
    assert.equal(ctx.contratStaff({ fin_contrat: null }), "sans_contrat");
    assert.equal(ctx.contratStaff({ fin_contrat: "  " }), "sans_contrat");
    assert.equal(ctx.finContratLisible({ fin_contrat: null }), "Sans contrat");
});

test("appliquerTriStaff classe par CA, âge, salaire et fin de contrat", () => {
    const { ctx } = contexte();
    const liste = () => STAFF.slice();
    ctx.staffSort = "ca_desc";
    assert.equal(ctx.appliquerTriStaff(liste())[0].nom, "Star mondiale");
    ctx.staffSort = "age_asc";
    assert.equal(ctx.appliquerTriStaff(liste())[0].nom, "Coach E");
    ctx.staffSort = "salaire_desc";
    assert.equal(ctx.appliquerTriStaff(liste())[0].nom, "Star mondiale");
    ctx.staffSort = "contrat_asc";
    const parContrat = ctx.appliquerTriStaff(liste());
    assert.equal(parContrat[0].nom, "Coach A");
    assert.equal(parContrat[parContrat.length - 1].nom, "Coach B", "les profils sans contrat passent en dernier");
    ctx.staffSort = "";
});

test("les statistiques de division servent de référence, pas le meilleur du monde", () => {
    const { ctx, panneau } = contexte();
    ctx.afficherEvaluationStaff();
    const html = panneau.innerHTML;
    assert.match(html, /National League North/);
    assert.match(html, /médiane 60/);
    assert.match(html, /60e percentile/, "mon CA 70 face à 40/50/60/80/90 place le club au 60e percentile");
    assert.match(html, /5 profil\(s\) comparé\(s\)/);
    assert.doesNotMatch(html, /Star mondiale/, "la référence mondiale ne doit plus être proposée en division");
    assert.doesNotMatch(html, /CA 199/);
});

test("le passage en portée mondiale change la référence", () => {
    const { ctx } = contexte();
    ctx.staffScope = "monde";
    const html = rendre(ctx);
    assert.match(html, /le monde entier/);
    assert.match(html, /Star mondiale/);
});

test("une division trop peu fournie est élargie à la nation et signalée", () => {
    const { ctx } = contexte();
    ctx.rawData.staff = STAFF.filter(membre => membre.metier !== "Coach" || ["Mon entraîneur", "Coach A"].includes(membre.nom));
    const html = rendre(ctx);
    assert.match(html, /trop peu de profils en division/);
    assert.match(html, /votre nation/);
});

test("un métier non couvert est signalé comme un écart", () => {
    const { ctx } = contexte();
    ctx.rawData.staff = STAFF.filter(membre => membre.metier !== "Physio" || membre.uid !== 102);
    const html = rendre(ctx);
    assert.match(html, /métier non couvert dans votre staff/);
});

test("percentileValeur et statistiquesValeurs gèrent les cas limites", () => {
    const { ctx } = contexte();
    assert.equal(ctx.percentileValeur(70, [40, 50, 60, 80, 90]), 60);
    assert.equal(ctx.percentileValeur(70, []), null);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.statistiquesValeurs([40, 50, 60, 80, 90]))), { effectif: 5, mediane: 60, p90: 86, maximum: 90 });
    assert.equal(ctx.statistiquesValeurs([]), null);
    assert.equal(ctx.porteeEffective([], "division", null), "nation");
    assert.equal(ctx.porteeEffective([1, 2, 3], "division", 500), "division");
    assert.equal(ctx.porteeEffective([1, 2], "division", 500), "nation");
    assert.equal(ctx.porteeEffective([1], "monde", 500), "monde");
    assert.equal(ctx.dansPortee({ competition: 500, nation: 765 }, "division", 500, 765), true);
    assert.equal(ctx.dansPortee({ competition: 900, nation: 11 }, "division", 500, 765), false);
    assert.equal(ctx.dansPortee({ competition: 900, nation: 765 }, "division", 500, 765), false, "une autre compétition n’est pas votre division, même dans votre nation");
    assert.equal(ctx.dansPortee({ competition: null, nation: 765 }, "division", 500, 765), true, "repli sur la nation quand la compétition du club est inconnue");
    assert.equal(ctx.dansPortee({ competition: null, nation: 11 }, "division", 500, 765), false);
});