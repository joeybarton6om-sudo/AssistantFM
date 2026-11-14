"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const start = source.indexOf("async function extraireDepuisLeSite()");
const end = source.indexOf("\nfunction changerOnglet(", start);
assert.ok(start >= 0 && end > start);
const extraction = source.slice(start, end);

test("l’interface charge le fichier de résultat après une réponse d’extraction légère", () => {
    assert.match(extraction, /fetch\(`\/players_data\.json\?t=\$\{Date\.now\(\)\}`/);
    assert.match(extraction, /afficherDonnees\(data\)/);
    assert.match(extraction, /Réponse du service d'extraction invalide \(HTTP/);
});

test("l’interface signale clairement un échec HTTP au chargement du résultat", () => {
    assert.match(extraction, /fichier des données est inaccessible \(HTTP \$\{dataResponse\.status\}\)/);
    assert.match(extraction, /fichier des données des joueurs et du staff est invalide/);
    assert.match(extraction, /Connexion au fichier des données interrompue/);
});

test("l’analyse JSON traite progressivement des blocs réseau fragmentés", async () => {
    const start = source.indexOf("async function lireJsonEnFlux(");
    const end = source.indexOf("\nasync function extraireDepuisLeSite(", start);
    assert.ok(start >= 0 && end > start);
    const context = vm.createContext({ TextDecoder, JSON, Number, Math, Error });
    vm.runInContext(source.slice(start, end), context);
    const expected = {
        joueurs: [
            { nom: "Zoé Étoile", commentaire: 'une accolade } et guillemet " dedans', stats: [1, 2, { note: 18 }] },
            { nom: "André", commentaire: "barre oblique \\\\ et crochet ]" }
        ],
        staff: [],
        metadonnees: { actif: true, valeur: null }
    };
    const bytes = new TextEncoder().encode(JSON.stringify(expected));
    const chunks = [];
    for (let index = 0; index < bytes.length; index += 5) {
        chunks.push(bytes.slice(index, index + 5));
    }
    let position = 0;
    let dernierOctet = 0;
    const resultat = await context.lireJsonEnFlux({
        body: {
            getReader: () => ({
                async read() {
                    if (position === chunks.length) return { done: true };
                    return { done: false, value: chunks[position++] };
                }
            })
        },
        headers: { get: () => String(bytes.length) }
    }, octets => { dernierOctet = octets; });

    assert.deepEqual(JSON.parse(JSON.stringify(resultat)), expected);
    assert.equal(dernierOctet, bytes.length);
});

test("l’analyse JSON rejette un flux tronqué au lieu d’accepter des données incomplètes", async () => {
    const start = source.indexOf("async function lireJsonEnFlux(");
    const end = source.indexOf("\nasync function extraireDepuisLeSite(", start);
    const context = vm.createContext({ TextDecoder, JSON, Number, Math, Error });
    vm.runInContext(source.slice(start, end), context);
    const bytes = new TextEncoder().encode('{"joueurs":[{"nom":"incomplet"}');
    let lu = false;
    await assert.rejects(
        context.lireJsonEnFlux({
            body: {
                getReader: () => ({
                    async read() {
                        if (lu) return { done: true };
                        lu = true;
                        return { done: false, value: bytes };
                    }
                })
            }
        }),
        /JSON tronqué/
    );
});
