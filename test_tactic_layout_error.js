"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const start = source.indexOf("function afficherTactiqueDetail()");
const end = source.indexOf("\nfunction noteRole(", start);
assert.ok(start >= 0 && end > start);

test("l’erreur de layout des tactiques est affichée sans masquer les autres données", () => {
    const detail = { textContent: "", innerHTML: "" };
    const context = vm.createContext({
        rawData: {
            tactiques: [],
            selections: [],
            version_jeu: { build: "27.0.1+2486697" },
            erreur_tactiques: "Layout <inconnu> dans tactics_man"
        },
        document: {
            getElementById: id => id === "tactique-detail" ? detail : { value: "" }
        },
        escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, character => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            })[character]);
        }
    });

    vm.runInContext(source.slice(start, end), context);
    context.afficherTactiqueDetail();

    assert.match(detail.innerHTML, /27\.0\.1\+2486697/);
    assert.match(detail.innerHTML, /Le reste de la sauvegarde reste disponible/);
    assert.match(detail.innerHTML, /Layout &lt;inconnu&gt; dans tactics_man/);
    assert.match(detail.innerHTML, /role="alert"/);
});
