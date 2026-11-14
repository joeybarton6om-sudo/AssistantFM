"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "alertes.js"), "utf8");

function contexte(stockage, joueurs) {
    const donnees = new Map(Object.entries(stockage || {}));
    const ctx = {
        rawData: {
            joueurs: joueurs || [],
            club_gere: { name: "FC Test", unique_id: 7 },
            date_sauvegarde: "2026-06-15"
        },
        clePourPartie: cle => cle,
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        formatMoney: value => value == null ? "—" : value + " EUR",
        dateJeuUtc: value => {
            const date = new Date(String(value) + "T00:00:00Z");
            return Number.isNaN(date.getTime()) ? null : date;
        },
        escapeHtml: value => String(value ?? ""),
        localStorage: {
            getItem: cle => donnees.has(cle) ? donnees.get(cle) : null,
            setItem: (cle, valeur) => donnees.set(cle, valeur)
        },
        document: { getElementById: () => null, querySelector: () => null },
        console,
        setTimeout
    };
    ctx.window = ctx;
    ctx.AssistantFMSuivi = { liste: () => [] };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    return { ctx, donnees };
}

const plain = valeur => JSON.parse(JSON.stringify(valeur));
const noms = liste => Array.from(liste, item => item.nom);

const joueurs = [
    { unique_id: 1, nom: "Alpha", club: "FC Test", est_mon_club: true, ca: 15, pa: 17, fin_contrat: "2026-08-01", valeur_marchande: 1000 },
    { unique_id: 2, nom: "Beta", club: "FC B", est_mon_club: false, ca: 13, pa: 12, fin_contrat: "2028-06-30", valeur_marchande: 2000 },
    { unique_id: 3, nom: "Gamma", club: "FC Test", est_mon_club: true, ca: 16, pa: 18, fin_contrat: "2026-07-01", valeur_marchande: 500 }
];

test("lireAlertes normalise les règles et ignore les entrées invalides", () => {
    const brut = {
        version: 1,
        filtres: [],
        capture: null,
        derniereAlerte: null,
        regles: [
            { id: "r1", type: "ca", portee: "tous", seuil: "15" },
            { id: "r2", type: "inconnu", portee: "tous", seuil: 10 },
            { id: "r3", type: "pa", portee: "ailleurs", seuil: 10 },
            { id: "r4", type: "contrat", portee: "club", seuil: 0 },
            { id: "r5", type: "valeur", portee: "suivi", seuil: -3 }
        ]
    };
    const { ctx } = contexte({ "assistantfm-alertes-v1-7-FC Test": JSON.stringify(brut) });
    const data = ctx.lireAlertes();
    assert.equal(data.regles.length, 1);
    assert.deepEqual(plain(data.regles[0]), { id: "r1", type: "ca", portee: "tous", seuil: 15 });
});

test("lireAlertes refuse une structure corrompue sans écraser le stockage", () => {
    const mauvais = JSON.stringify({ version: 1, filtres: "non" });
    const { ctx, donnees } = contexte({ "assistantfm-alertes-v1-7-FC Test": mauvais });
    assert.throws(() => ctx.lireAlertes(), { message: /invalides/ });
    assert.equal(donnees.get("assistantfm-alertes-v1-7-FC Test"), mauvais);
});

test("descriptionRegle et libellePortee décrivent la règle", () => {
    const { ctx } = contexte({}, joueurs);
    assert.equal(ctx.descriptionRegle({ type: "contrat", seuil: 6 }), "Contrat ≤ 6 mois");
    assert.equal(ctx.descriptionRegle({ type: "valeur", seuil: 10 }), "Baisse de valeur ≥ 10 %");
    assert.equal(ctx.descriptionRegle({ type: "ca", seuil: 15 }), "CA ≥ 15");
    assert.equal(ctx.descriptionRegle({ type: "pa", seuil: 16 }), "PA ≥ 16");
    assert.equal(ctx.libellePortee("suivi"), "Joueurs suivis");
    assert.equal(ctx.libellePortee("club"), "Mon club");
    assert.equal(ctx.libellePortee("tous"), "Tous les joueurs");
});

test("porteeJoueurs filtre le club et accepte les joueurs suivis", () => {
    const { ctx } = contexte({}, joueurs);
    const index = new Map(joueurs.map(joueur => [String(joueur.unique_id), joueur]));
    assert.deepEqual(noms(ctx.porteeJoueurs("club", index)), ["Alpha", "Gamma"]);
    assert.equal(ctx.porteeJoueurs("tous", index).length, 3);
    assert.equal(ctx.porteeJoueurs("suivi", index).length, 0);
});

test("evaluerRegles détecte les contrats courts et les CA élevés", () => {
    const { ctx } = contexte({}, joueurs);
    const index = new Map(joueurs.map(joueur => [String(joueur.unique_id), joueur]));
    const data = {
        regles: [
            { id: "c", type: "contrat", portee: "club", seuil: 3 },
            { id: "a", type: "ca", portee: "tous", seuil: 15 }
        ]
    };
    const resultats = ctx.evaluerRegles(data, index);
    const contrat = resultats.find(item => item.regle.id === "c");
    const ca = resultats.find(item => item.regle.id === "a");
    assert.deepEqual(noms(contrat.joueurs.map(item => item.player)), ["Gamma", "Alpha"]);
    assert.match(String(contrat.joueurs[0].detail), /j · 2026-07-01/);
    assert.deepEqual(noms(ca.joueurs.map(item => item.player)), ["Gamma", "Alpha"]);
});

test("evaluerRegles signale le besoin d’une référence pour la valeur", () => {
    const { ctx } = contexte({}, joueurs);
    const index = new Map(joueurs.map(joueur => [String(joueur.unique_id), joueur]));
    const data = { regles: [{ id: "v", type: "valeur", portee: "tous", seuil: 10 }] };
    const resultat = ctx.evaluerRegles(data, index)[0];
    assert.equal(resultat.needsBaseline, true);
    assert.equal(resultat.joueurs.length, 0);
});

test("evaluerRegles calcule la baisse de valeur avec une référence", () => {
    const { ctx } = contexte({}, joueurs);
    const index = new Map(joueurs.map(joueur => [String(joueur.unique_id), joueur]));
    const data = {
        derniereAlerte: { valeursAvant: { "1": 1250, "2": 2000, "3": 500 } },
        regles: [{ id: "v", type: "valeur", portee: "tous", seuil: 10 }]
    };
    const resultat = ctx.evaluerRegles(data, index)[0];
    assert.equal(resultat.needsBaseline, undefined);
    assert.deepEqual(noms(resultat.joueurs.map(item => item.player)), ["Alpha"]);
    assert.match(String(resultat.joueurs[0].detail), /20\.0 %/);
});