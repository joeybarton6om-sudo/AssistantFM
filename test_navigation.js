"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { generateKeyPairSync, sign, webcrypto } = require("node:crypto");

test("les liens Discord de l'application et de l'installation ciblent l'invitation communautaire", () => {
    const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
    const installer = fs.readFileSync(path.join(__dirname, "assistant_installateur.iss"), "utf8");
    const invitation = "https://discord.gg/YR2e8kMHeF";
    assert.match(html, new RegExp(`<a class="discord-link" href="${invitation}" target="_blank" rel="noopener noreferrer"`));
    assert.match(html, /class="discord-link"[^>]+aria-label="Rejoindre le Discord communautaire/);
    assert.ok(installer.includes(`ShellExec('open', '${invitation}'`));
    assert.ok(installer.includes("CommunityLink.OnClick := @OpenDiscord;"));
});

test("le chargement conserve la vue active sans demander l'accès premium", () => {
    const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const debut = source.indexOf("function afficherDonnees(");
    const fin = source.indexOf("function basculerDecouverte(", debut);
    assert.ok(debut >= 0 && fin > debut);
    const ctx = vm.createContext({
        mode: "joueurs", modeDecouverte: false, rawData: {}, sourceData: null,
        clubActiveTab: "effectif", st: { style: {} }, vues: [],
        leagueNamesByTeam: new Map(),
        reinitialiserScenario() {}, reinitialiserDirecteur() {}, actualiserPortraits() {},
        appliquerThemeClub() {}, alimenterFiltresStaff() {}, alimenterTactiques() {},
        afficherEvaluationStaff() {}, actualiserAlertesChargement() {}, capturerEvolution() {},
        chargerPonderations() {}, actualiserStatutBase() {}, filtrerTout() {},
        changerOnglet(vue) { ctx.vues.push(vue); }
    });

    vm.runInContext(source.slice(debut, fin), ctx);
    for (const vue of ["joueurs", "staff", "club"]) {
        ctx.mode = vue;
        ctx.afficherDonnees({ joueurs: [], staff: [] });
        assert.equal(ctx.vues.pop(), vue);
    }
});

test("les libellés de postes anglais sont traduits et abrégés en français", () => {
    const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const ctx = vm.createContext({});
    const mapStart = source.indexOf("const codePosteNom =");
    const mapEnd = source.indexOf("\nsaveInput.addEventListener", mapStart);
    const postesStart = source.indexOf("const postes = {");
    const postesEnd = source.indexOf("\n};", postesStart) + 3;
    const functionsStart = source.indexOf("function clePosteDepuisNom(");
    const functionsEnd = source.indexOf("\nfunction alimenterTactiques(", functionsStart);
    assert.ok(mapStart >= 0 && mapEnd > mapStart);
    assert.ok(postesStart >= 0 && postesEnd > postesStart);
    assert.ok(functionsStart >= 0 && functionsEnd > functionsStart);
    vm.runInContext(source.slice(mapStart, mapEnd), ctx);
    vm.runInContext(source.slice(postesStart, postesEnd), ctx);
    vm.runInContext(source.slice(functionsStart, functionsEnd), ctx);

    assert.equal(ctx.posteAbrege({ positions_naturelles: ["Goalkeeper"] }), "GB");
    assert.equal(ctx.posteAbrege({ positions_naturelles: ["Central Defender"] }), "DC");
    assert.equal(ctx.posteAbrege({ positions_naturelles: ["Right Wing Back"] }), "PDD");
    assert.equal(ctx.nomPoste("Attacking Midfielder (Centre)"), "Milieu offensif axial (MOC)");
});

test("les noms de compétitions actualisés priment sur une ancienne extraction", () => {
    const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const debut = source.indexOf("function nomCompetition(");
    const fin = source.indexOf("\nfunction clubPourPersonne(", debut);
    assert.ok(debut >= 0 && fin > debut);
    const ctx = vm.createContext({ competitionNames: new Map([["914523", "Nom mis à jour"]]) });
    vm.runInContext(source.slice(debut, fin), ctx);
    assert.equal(ctx.nomCompetition({ competition_uid: 914523, competition_nom: "Ancien nom" }), "Nom mis à jour");
    assert.equal(ctx.nomCompetition({ competition_uid: 1, competition_nom: "Nom extrait" }), "Nom extrait");
});

test("les fiches de compétition séparent les tables et signalent les groupes ambigus", () => {
    const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const cleDebut = source.indexOf("function cleCompetition(");
    const cleFin = source.indexOf("\nfunction linkCompetition(", cleDebut);
    const debut = source.indexOf("function groupesClassement(");
    const fin = source.indexOf("\nfunction refreshPop(", debut);
    assert.ok(cleDebut >= 0 && cleFin > cleDebut && debut >= 0 && fin > debut);
    const ctx = vm.createContext({
        rawData: { clubs: [
            { uid: 1, name: "Zèbre", classements: [{ competition_id: 7, position: 1, points: 6 }] },
            { uid: 2, name: "Arsenal", classements: [{ competition_id: 7, position: 1, points: 4 }] },
            { uid: 3, name: "Autre", classements: [{ competition_id: 8, position: 2 }] }
        ] },
        nomCompetition: () => "Division",
        escapeHtml: value => String(value),
        logoLocalHtml: () => "",
        initialesVisuelles: () => "DI",
        linkClub: name => name,
        linkJoueur: player => player.nom,
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        competitionActiveTab: "classement"
    });
    vm.runInContext(source.slice(cleDebut, cleFin), ctx);
    vm.runInContext(source.slice(debut, fin), ctx);
    const html = ctx.renderCompetitionProfile({ competition_id: 7 });
    assert.match(html, /groupes ou phases ne peuvent pas être séparés/);
    assert.ok(html.indexOf("Arsenal") < html.indexOf("Zèbre"));
    assert.doesNotMatch(html, /Autre/);
    assert.match(html, /Buts marqués/);
    assert.match(html, /Buts encaissés/);
    assert.match(html, /réextrayez la sauvegarde/);
    assert.match(html, /Meilleurs buteurs/);
    assert.match(html, /Meilleurs passeurs/);
    assert.match(html, /Meilleures notes/);
    assert.match(html, /Statistiques absentes de cette base/);
    assert.match(html, /id="competition-panel-buteurs"[^>]* hidden/);

    ctx.rawData.clubs = [
        { uid: 1, name: "Bastia", classements: [
            { competition_id: 7, table_id: 0, nombre_clubs: 18, equipe_id: 10, position: 11, buts_marques: 0, buts_encaisses: 14 },
            { competition_id: 7, table_id: 1, nombre_clubs: 2, equipe_id: 10, position: 1 }
        ] },
        { uid: 2, name: "Amiens", classements: [
            { competition_id: 7, table_id: 0, nombre_clubs: 18, equipe_id: 11, position: 1 }
        ] }
    ];
    const tables = ctx.groupesClassement(ctx.rawData.clubs.flatMap(club =>
        club.classements.map(standing => ({ club, standing }))));
    assert.equal(tables.length, 2);
    assert.equal(tables[0].entries[0].club.name, "Amiens");
    assert.equal(tables[0].entries[1].club.name, "Bastia");
    assert.equal(tables[1].entries[0].club.name, "Bastia");
    assert.equal(tables[0].ambigu, false);
    const htmlAvecButs = ctx.renderCompetitionProfile({ competition_id: 7 });
    assert.match(htmlAvecButs, /Bastia<\/td><td>—<\/td><td>0<\/td><td>14<\/td>/);
    ctx.rawData.joueurs = [{ uid: 1, nom: "Joueur A" }, { uid: 2, nom: "Joueur B" }];
    ctx.rawData.statistiques_championnat_equipes = [
        { player_uid: 1, player_name: "Joueur A", team_id: 10, goals: 4, assists: 1, starts: 3, substitute_appearances: 1, rated_appearances: 4, average_rating: 7.5 },
        { player_uid: 2, player_name: "Joueur B", team_id: 11, goals: 2, assists: 5, starts: 5, substitute_appearances: 0, rated_appearances: 5, average_rating: 8.0 },
        { player_uid: 3, player_name: "Hors ligue", team_id: 12, goals: 99, assists: 99, rated_appearances: 1, average_rating: 10 },
        { player_uid: 4, player_name: "Sans note", team_id: 10, goals: 0, assists: 0, rated_appearances: 0, average_rating: null }
    ];
    const avecStats = ctx.renderCompetitionProfile({ competition_id: 7 });
    const panel = id => avecStats.split(`id="competition-panel-${id}"`)[1].split("</section>")[0];
    assert.match(panel("buteurs"), /Classement indicatif/);
    assert.ok(panel("buteurs").indexOf("Joueur A") < panel("buteurs").indexOf("Joueur B"));
    assert.ok(panel("passeurs").indexOf("Joueur B") < panel("passeurs").indexOf("Joueur A"));
    assert.ok(panel("notes").indexOf("Joueur B") < panel("notes").indexOf("Joueur A"));
    assert.match(panel("notes"), /8\.00/);
    assert.doesNotMatch(avecStats, /Hors ligue|Sans note/);
    assert.equal((panel("buteurs").match(/Joueur A/g) || []).length, 1);
    ctx.rawData.statistiques_championnat_equipes = null;
    ctx.rawData.erreur_statistiques_saison = "Lecteur indisponible";
    assert.match(ctx.renderCompetitionProfile({ competition_id: 7 }), /Lecture des statistiques impossible : Lecteur indisponible/);
});

test("un code bêta signé est accepté avant expiration et refusé à son échéance", async () => {
    const source = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const debut = source.indexOf("function decoderBase64Url(");
    const fin = source.indexOf("function appliquerLicencePremium(", debut);
    assert.ok(debut >= 0 && fin > debut);
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const issuedAt = Date.UTC(2026, 0, 1);
    const expiresAt = issuedAt + 14 * 24 * 60 * 60 * 1000;
    const payload = { product: "AssistantFM", version: 1, email: "beta@example.com", issuedAt, expiresAt };
    const bytes = Buffer.from(JSON.stringify(payload));
    const code = `AFM1.${bytes.toString("base64url")}.${sign("sha256", bytes, privateKey).toString("base64url")}`;
    let now = expiresAt - 1;
    const ctx = vm.createContext({
        window: { crypto: webcrypto }, crypto: webcrypto, atob, TextDecoder,
        Date: { now: () => now },
        fetch: async () => ({ ok: true, text: async () => publicKey.export({ type: "spki", format: "pem" }) })
    });
    vm.runInContext(source.slice(debut, fin), ctx);
    assert.equal((await ctx.verifierCodeLicence(code, "BETA@example.com")).expiresAt, expiresAt);
    await assert.rejects(ctx.verifierCodeLicence(code, "autre@example.com"), /adresse e-mail/);
    now = expiresAt;
    await assert.rejects(ctx.verifierCodeLicence(code, "beta@example.com"), /expiré/);
});
