"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function contexte() {
    const contexte = vm.createContext({
        rawData: { joueurs: [], tactiques: [] },
        ponderationsRoles: {},
        roles: { simple: { stats: ["a"] }, autre: { stats: ["b"] } },
        rolesParPoste: Object.fromEntries(
            ["gk", "dr", "dc", "dl", "dm", "mc", "mr", "ml", "amr", "aml", "amc", "stc", "wbr", "wbl"]
                .map(position => [position, ["simple", "autre"]])
        ),
        estNombre: value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)),
        donneesComparables: (player, position, role) => {
            const value = player.stats[role.stats[0]];
            return { score: Number.isFinite(value) && value >= 1 && value <= 20 ? value : null, aptitude: player.positions[position] };
        },
        coutEstime: player => player.cout
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "optimisation_tactique.js"), "utf8"), contexte);
    return contexte;
}

function brute(matrice, ligne = 0, occupes = new Set()) {
    if (ligne === matrice.length) return 0;
    let maximum = -Infinity;
    matrice[ligne].forEach((value, colonne) => {
        if (occupes.has(colonne)) return;
        occupes.add(colonne);
        maximum = Math.max(maximum, value + brute(matrice, ligne + 1, occupes));
        occupes.delete(colonne);
    });
    return maximum;
}

test("affectation optimale comparée à une recherche exhaustive", () => {
    const ctx = contexte();
    let seed = 7;
    for (let n = 1; n <= 5; n++) for (let essai = 0; essai < 60; essai++) {
        const matrice = Array.from({ length: n }, () => Array.from({ length: n + 2 }, () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed % 41 - 20;
        }));
        const colonnes = ctx.affectationOptimale(matrice);
        assert.equal(new Set(colonnes).size, n);
        assert.equal(colonnes.reduce((total, colonne, i) => total + matrice[i][colonne], 0), brute(matrice));
    }
});

test("titulaires optimisés globalement et doublures sans réutilisation", () => {
    const ctx = contexte();
    const formation = { id: "test", places: [{ numero: 0, position: "dc" }, { numero: 1, position: "mc" }] };
    const joueurs = [
        { uid: 1, positions: { dc: 20, mc: 20 }, stats: { a: 18, b: 17 } },
        { uid: 2, positions: { dc: 20, mc: 1 }, stats: { a: 14, b: 13 } },
        { uid: 3, positions: { dc: 1, mc: 20 }, stats: { a: 10, b: 9 } }
    ];
    const result = ctx.calculerFormationOptimale(formation, joueurs, 10, {});
    assert.equal(result.couverts, 2);
    assert.equal(result.places[0].titulaire.player.uid, 2);
    assert.equal(result.places[1].titulaire.player.uid, 1);
    const ids = result.places.flatMap(p => [p.titulaire?.player.uid, p.doublure?.player.uid]).filter(id => id != null);
    assert.equal(new Set(ids).size, ids.length);
    const impose = ctx.calculerFormationOptimale(formation, joueurs, 10, { 0: "autre" });
    assert.equal(impose.places[0].roleId, "autre");
    const incomplet = ctx.calculerFormationOptimale(formation, [{ uid: 4, positions: { dc: 20, mc: 20 }, stats: {} }], 10, {});
    assert.equal(incomplet.couverts, 0);
});

test("recrutement : référence, aptitude, données et coût inconnu", () => {
    const ctx = contexte();
    const player = (uid, cout, aptitude = 20, score = 15) => ({
        uid, nom: `Joueur ${uid}`, positions: { mc: aptitude }, stats: { a: score }, cout
    });
    ctx.rawData.joueurs = [player(1, 0), player(2, null), player(3, 1000), player(4, 0, 9), player(5, 0, 20, 0)];
    const place = { position: "mc", roleId: "simple", titulaire: null };
    assert.equal(ctx.ciblesOptimisation(place, 0).length, 1);
    assert.equal(ctx.ciblesOptimisation(place, null).length, 3);
    place.titulaire = { score: 15 };
    assert.equal(ctx.ciblesOptimisation(place, null).length, 0);
});

test("identifiants absents ou ambigus exclus de l'effectif", () => {
    const ctx = contexte();
    const player = uid => ({ uid, est_mon_club: true, positions: { dc: 20 }, stats: { a: 10 } });
    ctx.rawData.joueurs = [player(1), player(1), player(null), player(2)];
    const data = ctx.calculerOptimisationTactique();
    assert.equal(data.effectif, 1);
    assert.equal(data.exclus, 3);
});
