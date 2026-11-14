"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

test("les attributs affichent une explication au survol de leur nom", () => {
    const definitionsStart = source.indexOf("const nomsStats =");
    const definitionsEnd = source.indexOf("\nconst statutsEffectifFrancais", definitionsStart);
    const familiesStart = source.indexOf("const attributsParFamille =");
    const familiesEnd = source.indexOf("\nconst roles =", familiesStart);
    const rowStart = source.indexOf("function ligneAttributProfil(");
    const rowEnd = source.indexOf("\nfunction blocAttributsProfil(", rowStart);
    assert.ok(definitionsStart >= 0 && definitionsEnd > definitionsStart);
    assert.ok(familiesStart >= 0 && familiesEnd > familiesStart);
    assert.ok(rowStart >= 0 && rowEnd > rowStart);

    const context = vm.createContext({
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char])
    });
    const definitions = vm.runInContext(
        `${source.slice(definitionsStart, definitionsEnd)}; ({ nomsStats, explicationsAttributs })`,
        context
    );
    vm.runInContext(source.slice(familiesStart, familiesEnd), context);
    vm.runInContext(source.slice(rowStart, rowEnd), context);

    const families = vm.runInContext("attributsParFamille", context);
    const keys = Object.values(families).flat();
    assert.ok(keys.every(key => definitions.explicationsAttributs[key]));
    const row = context.ligneAttributProfil("finishing", { finishing: 17 }, new Set());
    assert.match(row, /title="Précision pour conclure les occasions de but\."/);
    assert.match(row, /class="profile-stat-label"/);
    const escaped = context.ligneAttributProfil("injury_proneness", { injury_proneness: 5 }, new Set());
    assert.match(escaped, /risque\./);
});
