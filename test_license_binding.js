"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { generateKeyPairSync, sign, webcrypto } = require("node:crypto");

function stockage() {
    const data = new Map();
    return {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key),
    };
}

test("activation signée dans le navigateur et restauration du même binding", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const now = Date.now();
    const payload = { product: "AssistantFM", version: 1, email: "test@example.com", licenseId: "test-id", issuedAt: now, expiresAt: now + 60000 };
    const bytes = Buffer.from(JSON.stringify(payload));
    const code = `AFM1.${bytes.toString("base64url")}.${sign("sha256", bytes, privateKey).toString("base64url")}`;
    const localStorage = stockage();
    localStorage.setItem("assistantfm_machine_id", "browser:test-machine");
    const window = { crypto: webcrypto, location: { origin: "http://127.0.0.1:8765" } };
    const ctx = vm.createContext({
        window, localStorage, crypto: webcrypto, atob, TextDecoder, Uint8Array, console,
        fetch: async () => ({ ok: true, text: async () => publicKey.export({ type: "spki", format: "pem" }) })
    });
    const binding = fs.readFileSync(path.join(__dirname, "license_binding.js"), "utf8");
    vm.runInContext(binding, ctx);
    const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    vm.runInContext(app.slice(app.indexOf("function decoderBase64Url("), app.indexOf("function appliquerLicencePremium(")), ctx);
    const verified = await ctx.verifierCodeLicence(code, " TEST@example.com ");
    assert.equal(verified.licenseId, "test-id");
    const first = await ctx.moduleLiaisonLicence().verifyLicenseForThisMachine(code, " TEST@example.com ");
    assert.equal(first.valide, true);
    assert.equal(first.offline, true);
    assert.equal(first.nouveau_binding, true);
    const next = await ctx.moduleLiaisonLicence().verifyLicenseForThisMachine(code, "test@example.com");
    assert.equal(next.valide, true);
    assert.equal(next.nouveau_binding, undefined);
    await assert.rejects(ctx.verifierCodeLicence(code, "other@example.com"), /adresse e-mail différente/);
    await assert.rejects(ctx.verifierCodeLicence(code.slice(0, -4) + "AAAA", "test@example.com"), /invalide|modifié/);
});

test("un échec natif reste explicite et ne crée pas de liaison locale", async () => {
    const localStorage = stockage();
    const window = { pywebview: { api: {
        get_machine_id: async () => "machine-native-123",
        verifier_binding_licence: async () => { throw new Error("Stockage natif indisponible"); }
    } } };
    const ctx = vm.createContext({ window, localStorage, console });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "license_binding.js"), "utf8"), ctx);
    await assert.rejects(window.LicenseBinding.verifyLicenseForThisMachine("code", "test@example.com"), /Stockage natif indisponible/);
    assert.equal(localStorage.getItem("assistantfm_license_binding"), null);
});

test("module manquant : erreur claire plutôt qu'une erreur technique", () => {
    const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const ctx = vm.createContext({ window: {} });
    vm.runInContext(app.slice(app.indexOf("function moduleLiaisonLicence("), app.indexOf("function appliquerLicencePremium(")), ctx);
    assert.throws(() => ctx.moduleLiaisonLicence(), /module de licence.*chargé/i);
});
