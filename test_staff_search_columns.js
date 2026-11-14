"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const start = source.indexOf("function configEnTetes()");
const end = source.indexOf("\nfunction trier(", start);
assert.ok(start >= 0 && end > start);

test("le tableau de recherche du staff n’affiche plus la colonne Stats", () => {
    let headers = [];
    let colgroup;
    const table = {
        querySelector: () => null,
        prepend(element) {
            colgroup = element;
        }
    };
    const headerRow = {
        closest: () => table,
        appendChild(element) {
            headers.push(element);
        },
        replaceChildren(...elements) {
            headers = elements;
        }
    };
    const context = vm.createContext({
        mode: "staff",
        rawData: { joueurs: [], staff: [] },
        tbody: { querySelector: () => null },
        document: {
            getElementById: id => id === "th-dynamique" ? headerRow : null,
            createElement: () => ({
                style: {},
                children: [],
                appendChild(element) {
                    this.children.push(element);
                },
                addEventListener() {}
            })
        }
    });

    vm.runInContext(source.slice(start, end), context);
    context.configEnTetes();

    const labels = headers.map(header => header.textContent);
    assert.deepEqual(labels, ["Nom", "Nationalité", "Métier", "Âge", "CA", "PA", "Ligue", "Salaire actuel", "Club"]);
    assert.equal(colgroup.children.length, labels.length);
});
