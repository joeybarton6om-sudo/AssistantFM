"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const start = source.indexOf("function joueursComparaisonProfil(");
const end = source.indexOf("\nfunction joueurAuPoste(", start);
assert.ok(start >= 0 && end > start);

function candidatesFor(player, joueurs) {
    const context = vm.createContext({
        rawData: { joueurs },
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value))
    });
    vm.runInContext(source.slice(start, end), context);
    return JSON.parse(JSON.stringify(context.joueursComparaisonProfil(player)));
}

test("le comparateur propose les joueurs de l’effectif avec attributs, sauf le joueur observé", () => {
    const observed = { uid: 1, nom: "Joueur observé", est_mon_club: true, stats: { finishing: 12 } };
    const teammates = [
        { uid: 3, nom: "Zoé", poste: "GB", est_mon_club: true, stats: { reflexes: 14 } },
        { uid: 2, nom: "André", poste: "DC", est_mon_club: true, stats: { tackling: 13 } },
        { uid: 4, nom: "Sans attribut", est_mon_club: true, stats: {} },
        { uid: 5, nom: "Autre club", est_mon_club: false, stats: { finishing: 20 } }
    ];

    const options = candidatesFor(observed, [observed, ...teammates]);

    assert.deepEqual(options.map(option => [option.index, option.player.nom]), [[2, "André"], [1, "Zoé"]]);
});

test("le comparateur exclut aussi un doublon portant le même identifiant que le joueur observé", () => {
    const observed = { uid: 7, nom: "Joueur observé", est_mon_club: true, stats: { finishing: 12 } };
    const duplicate = { uid: 7, nom: "Doublon", est_mon_club: true, stats: { finishing: 18 } };
    const teammate = { uid: 8, nom: "Coéquipier", est_mon_club: true, stats: { finishing: 14 } };

    const options = candidatesFor(observed, [observed, duplicate, teammate]);

    assert.deepEqual(options.map(option => option.player.nom), ["Coéquipier"]);
});

test("la fiche propose un sélecteur au comparateur automatique et conserve le choix manuel", () => {
    assert.match(source, /<select id="profile-comparison-player" aria-label="Choisir le joueur de référence">/);
    assert.match(source, /const automaticBenchmark = meilleurJoueurAuPoste/);
    assert.match(source, /profileComparisonPlayerIndex == null[\s\S]*?selectedBenchmark/);
    assert.match(source, /profileComparisonPlayerIndex = comparisonSelect\.value === ""[\s\S]*?refreshPop\(\)/);
    assert.match(source, /profileComparisonPlayerIndex = null;/);
});
