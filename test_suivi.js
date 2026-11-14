"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "suivi.js"), "utf8");

function contexte(joueurs, stockage) {
    const donnees = new Map(Object.entries(stockage || {}));
    const ctx = {
        rawData: { joueurs, club_gere: { uid: 7 } },
        clePourPartie: cle => cle,
        escapeHtml: value => String(value ?? ""),
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        formatMoney: value => value == null ? "—" : value + " EUR",
        coutEstime: () => 0,
        noteRole: () => 10,
        traduireStatutEffectif: statut => statut || "—",
        afficherPoste: () => "BU",
        roles: {},
        rolesParPoste: {},
        postes: {},
        nomsStats: {},
        changerOnglet: () => {},
        localStorage: {
            getItem: cle => donnees.has(cle) ? donnees.get(cle) : null,
            setItem: (cle, valeur) => donnees.set(cle, valeur)
        },
        document: { getElementById: () => null },
        window: {}
    };
    ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(source + "\n;globalThis.__expose = window.AssistantFMSuivi;", ctx);
    return { ctx, donnees };
}

const arr = valeur => Array.from(valeur);

const joueurs = [
    { uid: 1, unique_id: 10, nom: "Alpha", club: "FC A", age: 24, ca: 15, pa: 17, stats: {} },
    { uid: 2, unique_id: 11, nom: "Beta", club: "FC B", age: 28, ca: 13, pa: 14, stats: {} },
    { uid: 3, unique_id: 12, nom: "Gamma", club: "FC C", age: 21, ca: 16, pa: 18, stats: {} }
];

test("ajouter enregistre les champs par défaut", () => {
    const { ctx, donnees } = contexte(joueurs);
    assert.equal(ctx.__expose.ajouter(joueurs[0]), true);
    const enregistre = JSON.parse(donnees.get("assistantfm-suivi-v1:7"));
    assert.equal(enregistre.cibles.length, 1);
    assert.deepEqual(enregistre.cibles[0].tags, []);
    assert.equal(enregistre.cibles[0].statut, "a_suivre");
    assert.match(enregistre.cibles[0].ajoute_le, /^\d{4}-\d{2}-\d{2}T/);
});

test("enregistrerTags limite à cinq tags de vingt caractères et dédoublonne", () => {
    const { ctx } = contexte(joueurs);
    ctx.__expose.ajouter(joueurs[0]);
    const id = ctx.__expose.liste()[0].id;
    const tags = ctx.__expose.enregistrerTags(id, ["prioritaire", "  pret  ", "prioritaire", "x".repeat(30), "cinq", "six"]);
    assert.deepEqual(arr(tags), ["prioritaire", "pret", "x".repeat(20), "cinq", "six"]);
    assert.deepEqual(arr(ctx.__expose.liste()[0].tags), arr(tags));
});

test("enregistrerTags accepte une chaîne séparée par des virgules", () => {
    const { ctx } = contexte(joueurs);
    ctx.__expose.ajouter(joueurs[0]);
    const id = ctx.__expose.liste()[0].id;
    const tags = ctx.__expose.enregistrerTags(id, "un, deux ,");
    assert.deepEqual(arr(tags), ["un", "deux"]);
});

test("enregistrerStatut refuse une valeur inconnue", () => {
    const { ctx } = contexte(joueurs);
    ctx.__expose.ajouter(joueurs[0]);
    const id = ctx.__expose.liste()[0].id;
    assert.equal(ctx.__expose.enregistrerStatut(id, "negociation"), undefined);
    assert.equal(ctx.__expose.liste()[0].statut, "negociation");
    assert.throws(() => ctx.__expose.enregistrerStatut(id, "inconnu"), { message: /inconnu/i });
    assert.equal(ctx.__expose.liste()[0].statut, "negociation");
});

test("une liste sans tags ni statut reste lisible", () => {
    const ancien = {
        "assistantfm-suivi-v1:7": JSON.stringify({
            version: 1,
            cibles: [{ id: "a", ref: { uid: "1", uniqueId: "10", nom: "Alpha" }, note: "" }]
        })
    };
    const { ctx } = contexte(joueurs, ancien);
    const cibles = ctx.__expose.liste();
    assert.equal(cibles.length, 1);
    assert.deepEqual(arr(cibles[0].tags), []);
    assert.equal(cibles[0].statut, "a_suivre");
});

test("une liste corrompue est refusée sans écraser le stockage", () => {
    const mauvais = { "assistantfm-suivi-v1:7": JSON.stringify({ version: 1, cibles: [{ id: "a" }] }) };
    const { ctx, donnees } = contexte(joueurs, mauvais);
    assert.throws(() => ctx.__expose.liste(), { message: /invalide/ });
    assert.equal(donnees.get("assistantfm-suivi-v1:7"), mauvais["assistantfm-suivi-v1:7"]);
});

test("le tri et les filtres respectent le statut et les tags", () => {
    const { ctx } = contexte(joueurs);
    const [alpha, beta, gamma] = joueurs;
    ctx.__expose.ajouter(alpha);
    ctx.__expose.ajouter(beta);
    ctx.__expose.ajouter(gamma);
    const cibles = ctx.__expose.liste();
    const betaCible = cibles.find(cible => cible.ref.nom === "Beta");
    ctx.__expose.enregistrerStatut(betaCible.id, "negociation");
    ctx.__expose.enregistrerTags(betaCible.id, ["elite"]);
    ctx.__expose.enregistrerTags(cibles[0].id, ["elite"]);
    const maj = ctx.__expose.liste();

    assert.equal(ctx.__expose.filtrer(maj).length, 3);
    assert.deepEqual(arr(ctx.__expose.filtrer(maj, "negociation").map(cible => cible.ref.nom)), ["Beta"]);
    assert.equal(ctx.__expose.filtrer(maj, "", "elite").length, 2);
    assert.deepEqual(arr(ctx.__expose.trier(maj, "age").map(cible => cible.ref.nom)), ["Gamma", "Alpha", "Beta"]);
});

test("l’export CSV inclut statut, tags et note", () => {
    const { ctx } = contexte(joueurs);
    ctx.__expose.ajouter(joueurs[0]);
    const cible = ctx.__expose.liste()[0];
    ctx.__expose.enregistrerTags(cible.id, ["elite"]);
    ctx.__expose.enregistrerStatut(cible.id, "a_contacter");
    ctx.__expose.enregistrerNote(cible.id, "note;point");
    const csv = ctx.__expose.csv(ctx.__expose.liste());
    const lignes = csv.split("\r\n");
    assert.equal(lignes[0].split(";").length, 12);
    assert.match(csv, /À contacter/);
    assert.match(csv, /"note;point"/);
});