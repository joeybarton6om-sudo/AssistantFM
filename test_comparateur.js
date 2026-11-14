"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "comparateur.js"), "utf8");

const roles = {
    avant_point: { nom: "Avant-point", phase: "avec", stats: ["finishing", "off_the_ball"], postes: ["stc"] }
};
const rolesParPoste = { stc: ["avant_point"] };
const postes = { stc: "Buteur" };
const nomsStats = { finishing: "Finition", off_the_ball: "Placement" };

function contexte(joueurs) {
    const elements = new Map();
    const ctx = {
        rawData: { joueurs },
        roles, rolesParPoste, postes, nomsStats,
        escapeHtml: value => String(value ?? ""),
        formatMoney: value => value == null ? "—" : value + " EUR",
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        coutEstime: joueur => joueur.cout ?? null,
        noteRole: (joueur, role) => {
            const valeurs = role.stats.map(key => joueur.stats?.[key]);
            const nombre = valeur => valeur != null && valeur !== "" && Number.isFinite(Number(valeur));
            return valeurs.every(nombre) ? valeurs.reduce((a, b) => a + Number(b), 0) / valeurs.length : null;
        },
        afficherPoste: joueur => joueur.poste || "—",
        traduireStatutEffectif: statut => statut || "—",
        Blob: class { constructor() {} },
        URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
        setTimeout,
        document: {
            getElementById: id => elements.get(id) || null,
            createElement: () => ({ click() {} })
        }
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(source + "\n;globalThis.__expose = { radar: comparateurRadar, table: comparateurTable, csv: comparateurCsv, cle: cleComparateur, afficher: afficherComparateur, selection: () => [...comparateurSelection], maj: majSelectionComparateur };", ctx);
    return { ctx, elements };
}

const joueurs = [
    { uid: 1, unique_id: 10, nom: "Alpha", club: "FC A", age: 24, ca: 15, pa: 17, poste: "BU", stats: { finishing: 15, off_the_ball: 13 }, cout: 1000, valeur_marchande: 2000 },
    { uid: 2, unique_id: 11, nom: "Beta", club: "FC B", age: 28, ca: 13, pa: 14, poste: "BU", stats: { finishing: 12, off_the_ball: 16 }, cout: 900, valeur_marchande: 1500 }
];

test("cleComparateur privilégie unique_id puis retombe sur le nom", () => {
    const { ctx } = contexte(joueurs);
    assert.equal(ctx.__expose.cle(joueurs[0]), "10");
    assert.equal(ctx.__expose.cle({ nom: "Gamma" }), "Gamma");
});

test("comparateurRadar produit un polygone par joueur et une légende", () => {
    const { ctx } = contexte(joueurs);
    const svg = ctx.__expose.radar(joueurs, roles.avant_point, "stc");
    assert.match(svg, /<svg[^>]*class="comparateur-radar"/);
    assert.equal((svg.match(/<polygon[^>]*fill-opacity="0\.12"/g) || []).length, joueurs.length);
    assert.match(svg, /Alpha/);
    assert.match(svg, /Beta/);
    assert.match(svg, /Finition/);
});

test("comparateurRadar signale l’absence de sélection ou de rôle", () => {
    const { ctx } = contexte(joueurs);
    assert.match(ctx.__expose.radar([], roles.avant_point, "stc"), /Sélectionnez au moins un joueur/);
    assert.match(ctx.__expose.radar(joueurs, null, "stc"), /Choisissez un rôle/);
});

test("comparateurTable compare les attributs du rôle et marque les écarts", () => {
    const { ctx } = contexte(joueurs);
    const table = ctx.__expose.table(joueurs, roles.avant_point, "stc", "10");
    assert.match(table, /Finition/);
    assert.match(table, /<td class="comparison-worse">12 \(-3\)<\/td>/);
    assert.match(table, /Placement/);
    assert.match(table, /référence/);
});

test("comparateurCsv sépare les colonnes par point-virgule", () => {
    const { ctx } = contexte(joueurs);
    const csv = ctx.__expose.csv(joueurs, roles.avant_point, "stc", "10");
    const lignes = csv.split("\r\n");
    assert.equal(lignes[0], "Critère;Alpha;Beta");
    assert.ok(lignes.some(ligne => ligne.startsWith("Finition;")));
    assert.match(csv, /Score de rôle/);
});

test("comparateurCsv échappe les guillemets et les retours à la ligne", () => {
    const { ctx } = contexte([{ uid: 3, unique_id: 12, nom: 'Guillemet "test"\nligne', stats: {} }]);
    const csv = ctx.__expose.csv([joueurs[0], { ...joueurs[0], club: 'a"b;c' }], roles.avant_point, "stc", "10");
    assert.match(csv, /"a""b;c"/);
});

test("la vue comparateur affiche les contrôles et le picker des joueurs", () => {
    const { ctx, elements } = contexte(joueurs);
    const section = { innerHTML: "", addEventListener() {} };
    elements.set("comparateur-view", section);
    ctx.__expose.afficher();
    assert.match(section.innerHTML, /<h2>Comparateur de joueurs<\/h2>/);
    assert.match(section.innerHTML, /data-comparateur-poste/);
    assert.match(section.innerHTML, /data-comparateur-role/);
    assert.match(section.innerHTML, /data-comparateur-player="10"/);
    assert.match(section.innerHTML, /data-comparateur-export/);
});

test("la vue comparateur affiche un message sans sauvegarde chargée", () => {
    const { ctx, elements } = contexte([]);
    const section = { innerHTML: "", addEventListener() {} };
    elements.set("comparateur-view", section);
    ctx.__expose.afficher();
    assert.match(section.innerHTML, /Chargez une sauvegarde/);
});

test("la sélection est limitée à quatre joueurs", () => {
    const { ctx } = contexte(joueurs);
    ctx.__expose.maj("10", true);
    ctx.__expose.maj("11", true);
    assert.deepEqual(Array.from(ctx.__expose.selection()), ["10", "11"]);
    ctx.__expose.maj("11", false);
    assert.deepEqual(Array.from(ctx.__expose.selection()), ["10"]);
});