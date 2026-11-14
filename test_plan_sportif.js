"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function contexte() {
    const ctx = vm.createContext({
        roles: { role: {} },
        groupesTactiques: tactic => new Map(tactic.postes.map(slot => [
            slot.numero, { position: slot.position, slots: [slot] }
        ])),
        joueurAuPoste: (player, position) => player.scores[position] != null,
        noteRole: (player, role, position) => player.scores[position]
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "plan_sportif.js"), "utf8"), ctx);
    return ctx;
}

test("les choix manuels restent affectés et les doublures ne réutilisent pas les joueurs", () => {
    const ctx = contexte();
    const tactic = { postes: [
        { numero: 1, position: "dc", roleId: "role" },
        { numero: 2, position: "mc", roleId: "role" }
    ] };
    const joueurs = [
        { uid: 1, scores: { dc: 15, mc: 18 } },
        { uid: 2, scores: { dc: 12, mc: 13 } },
        { uid: 3, scores: { dc: 11 } },
        { uid: 4, scores: { mc: 10 } }
    ];
    const slots = ctx.repartirEffectif(tactic, joueurs, { 1: "1" });
    assert.equal(slots.find(slot => slot.numero === 1).titulaire.player.uid, 1);
    const ids = slots.flatMap(slot => [slot.titulaire?.player.uid, slot.doublure?.player.uid])
        .filter(id => id != null);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(ids.length, 4);
    const incompatible = ctx.repartirEffectif(tactic, joueurs, { 2: "3" });
    assert.notEqual(incompatible.find(slot => slot.numero === 2).titulaire.player.uid, 3);
});
