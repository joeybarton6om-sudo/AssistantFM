"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function contexte() {
    const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const fonctions = app.slice(app.indexOf("function ongletsProfil("), app.indexOf("function renderPlayerProfile("));
    const performances = fs.readFileSync(path.join(__dirname, "performances.js"), "utf8");
    const libelle = performances.slice(0, performances.indexOf("function afficherPerformances("));
    const ctx = vm.createContext({
        rawData: {},
        profileActiveTab: "profile",
        escapeHtml: value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
        linkClub: (name, id) => `club:${id}:${name}`,
    });
    vm.runInContext(libelle + fonctions, ctx);
    return ctx;
}

test("onglets joueur dans l'ordre et onglets staff sans recrutement", () => {
    const ctx = contexte();
    const html = ctx.ongletsProfil();
    assert.ok(html.indexOf(">Profil</button>") < html.indexOf(">Carrière</button>"));
    assert.ok(html.indexOf(">Carrière</button>") < html.indexOf(">Analyse de recrutement</button>"));
    assert.match(ctx.ongletsProfil(true), /Carrière/);
    assert.doesNotMatch(ctx.ongletsProfil(true), /Analyse de recrutement/);
    assert.match(ctx.panneauCarriere({}, true), /postes occupés par le staff n’est pas fourni/);
});

test("historique trié, champs absents, échec et anciennes bases", () => {
    const ctx = contexte();
    const html = ctx.renderCareerProfile({ historique_carriere: [
        { annee: 2020, club: null, type: "continental", titulaires: 0, note: null },
        { annee: 2025, club: "Club", club_uid: 42, type: "league", buts: 2, note: 6.5666666667 },
    ], saison_carriere: [{ club: "Club", club_uid: 42, type: "league", note: 7.0875 }, { note: 0 }] });
    assert.ok(html.indexOf("2025") < html.indexOf("2020"));
    assert.match(html, /club:42:Club/);
    assert.match(html, /Club non disponible/);
    assert.match(html, /Continental/);
    assert.match(html, /<td>0<\/td>/);
    assert.match(html, /incomplètes/);
    assert.match(html, /Saison actuelle/);
    assert.match(html, /Saisons archivées/);
    assert.match(html, /<td>6,57<\/td>/);
    assert.match(html, /<td>7,09<\/td>/);
    assert.match(html, /<td>0,00<\/td>/);
    assert.match(ctx.renderCareerProfile({ historique_carriere: [], saison_carriere: [] }), /Aucune ligne de carrière archivée/);
    assert.match(ctx.renderCareerProfile({}), /Réextrayez/);
    ctx.rawData.erreur_historique_carriere = "<erreur>";
    assert.match(ctx.renderCareerProfile({ saison_carriere: [{ note: 7 }] }), /role="alert".*&lt;erreur&gt;/);
    assert.match(ctx.renderCareerProfile({ saison_carriere: [{ note: 7 }] }), /7,00/);
    ctx.rawData.erreur_historique_carriere = null;
    ctx.rawData.erreur_statistiques_saison = "<saison>";
    assert.match(ctx.renderCareerProfile({ historique_carriere: [{ note: 8 }] }), /role="alert".*&lt;saison&gt;/);
    assert.match(ctx.renderCareerProfile({ historique_carriere: [{ note: 8 }] }), /8,00/);
});

test("en-tête complet hors des panneaux et attributs réservés au profil", () => {
    const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const source = app.slice(app.indexOf("function renderPlayerProfile("), app.indexOf("function renderStaffProfile("));
    const staffSource = app.slice(app.indexOf("function renderStaffProfile("), app.indexOf("function renderClubProfile("));
    const header = source.indexOf('<div class="profile-hero">');
    const ability = source.indexOf('class="profile-metric profile-ability-metric"', header);
    const finances = source.indexOf('class="profile-finances"', ability);
    const panel = source.indexOf('<section class="profile-tab-panel" id="profile-tab-profile"', finances);
    const attributes = source.indexOf('id="profile-attributes-field"', panel);
    const career = source.indexOf("${panneauCarriere(player)}", attributes);
    assert.ok(header >= 0 && ability > header && finances > ability && panel > finances);
    assert.ok(attributes > panel && career > attributes);
    assert.match(source.slice(finances, panel), /<\/div>\s*<\/div>\s*$/);
    assert.match(source, /<h2>\$\{lienProfil\("joueur", player\.uid/);
    assert.match(staffSource, /<h2>\$\{lienProfil\("staff", member\.uid/);
    assert.match(source, /\$\{profilPhysiqueJoueur\(player\)\}/);
});

test("les informations physiques affichent la taille et signalent le poids absent", () => {
    const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
    const start = app.indexOf("function profilPhysiqueJoueur(");
    const end = app.indexOf("\nfunction renderPlayerProfile(", start);
    assert.ok(start >= 0 && end > start);
    const ctx = vm.createContext({
        estNombre: value => value != null && value !== "" && Number.isFinite(Number(value)),
        escapeHtml: value => String(value)
    });
    vm.runInContext(app.slice(start, end), ctx);

    assert.match(ctx.profilPhysiqueJoueur({ taille_cm: 184 }), /Taille : 184 cm/);
    assert.match(ctx.profilPhysiqueJoueur({ taille_cm: 184 }), /Poids : non disponible dans l’extraction/);
    assert.match(ctx.profilPhysiqueJoueur({ taille_cm: 184, poids_kg: 78 }), /Poids : 78 kg/);
});
