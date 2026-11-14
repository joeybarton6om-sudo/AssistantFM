"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

test("les sous-vues du club sont rangées sous Effectif, Tactique et Club", () => {
    const start = source.indexOf("target.innerHTML = `<h2>Mon club");
    const end = source.indexOf("</nav>", start);
    assert.ok(start >= 0 && end > start);
    const navigation = source.slice(start, end);

    for (const [group, tabs] of Object.entries({
        effectif: ["effectif", "diagnostic", "performances", "jeunes"],
        tactique: ["tactique", "laboratoire", "optimisation"],
        club: ["overview", "transferts", "confiance"]
    })) {
        const groupStart = navigation.indexOf(`data-club-group="${group}"`);
        const groupEnd = navigation.indexOf("</details>", groupStart);
        assert.ok(groupStart >= 0 && groupEnd > groupStart, `missing ${group} group`);
        const groupHtml = navigation.slice(groupStart, groupEnd);
        for (const tab of tabs) {
            assert.ok(groupHtml.includes(`data-club-tab="${tab}"`), `${tab} must be in ${group}`);
        }
    }

    assert.doesNotMatch(navigation, /data-club-group="fm27"|data-club-tab="efficacite"/);
    assert.match(source, /id="club-overview-effectif"/);
    assert.match(source, /id="club-overview-tactique"/);
    assert.match(source, /id="club-overview-overview"/);
    assert.match(source, /<select id="club-tactic-select" data-club-tactic>/);
});

test("les vues et scripts supprimés ne restent pas exposés dans la navigation", () => {
    assert.doesNotMatch(source, /club-overview-(?:entrainement|coups-pied-arretes|mentorat|installations|listes-staff)|afficherEfficaciteTactique/);
    assert.doesNotMatch(html, /efficacite_tactique|Efficacité tactique/);
});
