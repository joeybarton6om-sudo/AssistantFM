"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const start = source.indexOf("function avertissementFinances()");
const end = source.indexOf("\nfunction afficherMonClub(", start);
assert.ok(start >= 0 && end > start);

test("l’erreur de finances est affichée sans masquer les autres données", () => {
    const context = vm.createContext({
        rawData: { erreur_finances: "sponsor_lists_rejected=4 <invalid>" },
        escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, character => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            })[character]);
        }
    });

    vm.runInContext(source.slice(start, end), context);
    const message = context.avertissementFinances();

    assert.match(message, /Les données financières de cette sauvegarde FM27 ne sont pas disponibles/);
    assert.match(message, /le reste de la sauvegarde reste accessible/);
    assert.match(message, /sponsor_lists_rejected=4 &lt;invalid&gt;/);
    assert.match(message, /role="alert"/);
    context.rawData.erreur_finances = null;
    assert.equal(context.avertissementFinances(), "");
});
