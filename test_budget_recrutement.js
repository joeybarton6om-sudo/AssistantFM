"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function contexte() {
    const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const debut = source.indexOf("function valeurBudgetTransfert()");
    const fin = source.indexOf("function estAbordable(", debut);
    assert.ok(debut >= 0 && fin > debut);
    const ctx = vm.createContext({ rawData: { cadre_financier: {} } });
    vm.runInContext(`const multipleOffreDefaut = 1.5;\n${source.slice(debut, fin)}`, ctx);
    return ctx;
}

test("le budget provient de la sauvegarde et reste vide s'il manque", () => {
    const ctx = contexte();
    assert.equal(ctx.valeurBudgetTransfert(), "");
    ctx.rawData.cadre_financier.budget_transfert = 3091248;
    assert.equal(ctx.valeurBudgetTransfert(), "3091248");
    assert.equal(ctx.budgetTransfert(), 3091248);
    ctx.rawData.cadre_financier.budget_transfert = 0;
    assert.equal(ctx.valeurBudgetTransfert(), "0");
    ctx.rawData.cadre_financier.budget_transfert = -1;
    assert.equal(ctx.valeurBudgetTransfert(), "");
    ctx.rawData.cadre_financier = {};
    assert.equal(ctx.valeurBudgetTransfert(), "");
});

test("les coûts utilisent le coefficient fixe tout en préservant les anciennes alertes", () => {
    const ctx = contexte();
    const joueur = { sous_contrat: true, valeur_marchande: 100, clauses: [] };
    assert.equal(ctx.coutEstime(joueur), 150);
    assert.equal(ctx.coutEstime(joueur, "2"), 200);
    assert.equal(ctx.coutEstime({ ...joueur, sous_contrat: false }), 0);
    assert.equal(ctx.coutEstime({
        ...joueur, clauses: [{ kind: "minimum_fee_release", value: 80 }]
    }), 80);
    assert.equal(ctx.coutEstime({ ...joueur, valeur_marchande: null }), null);
});
