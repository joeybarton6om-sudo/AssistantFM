"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const start = source.indexOf("async function copierNomProfil(");
const end = source.indexOf("\nfunction escapeHtml(", start);
assert.ok(start >= 0 && end > start);

function createContext({ clipboardWrite, execCommand = true } = {}) {
    const status = { textContent: "", hidden: true };
    const modal = {
        contains(element) {
            return element.inModal;
        }
    };
    const context = {
        modal,
        navigator: clipboardWrite
            ? { clipboard: { writeText: clipboardWrite } }
            : {},
        document: {
            getElementById(id) {
                assert.equal(id, "profile-copy-status");
                return status;
            },
            createElement() {
                return {
                    style: {},
                    setAttribute() {},
                    select() {},
                    remove() {}
                };
            },
            body: { appendChild() {} },
            execCommand() {
                return execCommand;
            }
        },
        ouvrirProfil(...args) {
            context.openedProfiles.push(args);
        },
        openedProfiles: []
    };
    vm.runInContext(source.slice(start, end), vm.createContext(context));
    const handlerStart = source.indexOf('const profileLink = event.target.closest("[data-profile-kind]");');
    const handlerEnd = source.indexOf("\n});", handlerStart);
    assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
    const handler = `function gererClicProfil(event) { ${source.slice(handlerStart, handlerEnd)} }`;
    vm.runInContext(handler, context);
    return { context, status };
}

function createEvent({
    kind = "joueur",
    id = "personne-1",
    name = "Nom de test",
    inModal = true,
    copyName = true
} = {}) {
    const profileLink = {
        dataset: {
            profileKind: kind,
            profileId: id,
            profileName: name,
            profileCopyName: copyName ? "true" : "false"
        },
        textContent: name,
        inModal
    };
    const event = {
        target: { closest: () => profileLink },
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault() {
            this.defaultPrevented = true;
        },
        stopPropagation() {
            this.propagationStopped = true;
        }
    };
    return { event, profileLink };
}

test("cliquer sur le nom d’un joueur dans une bulle copie son nom", async () => {
    let copied;
    const { context, status } = createContext({
        clipboardWrite: async value => { copied = value; }
    });
    const { event } = createEvent();

    context.gererClicProfil(event);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(copied, "Nom de test");
    assert.equal(status.textContent, "Nom copié : Nom de test");
    assert.equal(status.hidden, false);
    assert.deepEqual(context.openedProfiles, []);
    assert.equal(event.defaultPrevented, true);
    assert.equal(event.propagationStopped, true);
});

test("cliquer sur un autre joueur depuis une bulle ouvre sa bulle au lieu de copier son nom", () => {
    let copied;
    const { context } = createContext({
        clipboardWrite: async value => { copied = value; }
    });
    const { event } = createEvent({
        id: "joueur-lie",
        name: "Autre joueur",
        copyName: false
    });

    context.gererClicProfil(event);

    assert.equal(copied, undefined);
    assert.deepEqual(context.openedProfiles, [["joueur", "joueur-lie", "Autre joueur", undefined, undefined]]);
    assert.equal(event.defaultPrevented, true);
    assert.equal(event.propagationStopped, true);
});

test("le clic dans la bulle copie aussi le nom d’un membre du staff", async () => {
    let copied;
    const { context } = createContext({
        clipboardWrite: async value => { copied = value; }
    });
    const { event } = createEvent({ kind: "staff", id: "staff-1", name: "Staff test" });

    context.gererClicProfil(event);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(copied, "Staff test");
    assert.deepEqual(context.openedProfiles, []);
});

test("seuls les noms des en-têtes de profil sont marqués pour la copie", () => {
    assert.match(source, /lienProfil\("joueur", player\.uid,[\s\S]*?player\.nom \|\| "Joueur", true\)/);
    assert.match(source, /lienProfil\("staff", member\.uid,[\s\S]*?member\.nom \|\| "Membre du staff", true\)/);
    assert.match(source, /copyName \? 'data-profile-copy-name="true"' : ""/);
});

test("le clic hors bulle garde l’ouverture du profil", () => {
    const { context } = createContext();
    const { event } = createEvent({ inModal: false, kind: "staff", name: "Staff externe" });

    context.gererClicProfil(event);

    assert.equal(context.openedProfiles.length, 1);
    assert.equal(context.openedProfiles[0][0], "staff");
    assert.equal(context.openedProfiles[0][2], "Staff externe");
});

test("l’échec de copie est affiché et le repli clipboard fonctionne", async () => {
    const { context, status } = createContext({ execCommand: false });
    context.navigator.clipboard = {
        writeText: async () => { throw new Error("Permission refusée"); }
    };

    await context.copierNomProfil("Nom à copier");

    assert.match(status.textContent, /Copie impossible : Le navigateur a refusé la copie/);
    assert.equal(status.hidden, false);
});
