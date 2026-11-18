const test = require("node:test");
const assert = require("node:assert");

require("./entrainement_collectif.js");
const entrainement = globalThis.AssistantFMEntrainementCollectif;

const JOUEURS = [];
const NOMS = ["G", "D1", "D2", "L", "R", "M1", "M2", "M3", "A1", "A2"];
const POSTES = ["gk", "dc", "dc", "dl", "dr", "dm", "mc", "amc", "st", "st"];
for (let i = 0; i < NOMS.length; i += 1) {
    JOUEURS.push({
        nom: NOMS[i],
        poste: POSTES[i],
        ca: 100 + i,
        est_mon_club: true,
        stats: {
            finishing: 7 + (i % 4),
            composure: 9 + (i % 2),
            technique: 10 + (i % 2),
            passing: 11 + (i % 3),
            marking: 14,
            tackling: 13,
            positioning: 13,
            pace: 8 + (i % 2),
            stamina: 10,
            work_rate: 8 + (i % 3),
            decisions: 11,
            off_the_ball: 7 + (i % 3),
            dribbling: 9,
            first_touch: 10,
            vision: 10,
            heading: 10,
            strength: 11,
            agility: 11,
            balance: 11,
            acceleration: 10,
            jumping_reach: 10,
            bravery: 12,
            concentration: 12,
            aggression: 11,
            anticipation: 10
        }
    });
}

const CALENDRIER = [
    { date: "2027-09-25", adversaire: "Blyth", lieu: "Domicile" },
    { date: "2027-09-28", adversaire: "Tamworth", lieu: "Extérieur" },
    { date: "2027-10-02", adversaire: "Altrincham", lieu: "Extérieur" },
    { date: "2027-10-09", adversaire: "Wealdstone", lieu: "Domicile" }
];

test("le catalogue couvre les 28 séances collectives de FM27 réparties en cinq onglets", () => {
    const ids = entrainement.SEANCES.map(seance => seance.id);
    assert.equal(entrainement.SEANCES.length, 28);
    assert.equal(new Set(ids).size, ids.length, "identifiants uniques");
    const onglets = [...new Set(entrainement.SEANCES.map(seance => seance.onglet))];
    assert.equal(onglets.length, 5);
    for (const seance of entrainement.SEANCES) {
        assert.ok(seance.nom && seance.nom.length > 0);
        assert.ok(Array.isArray(seance.blocs) && seance.blocs.length > 0, `${seance.id} doit être rattaché à un bloc`);
        assert.equal(typeof seance.charge, "number");
        assert.ok(seance.impacts && typeof seance.impacts === "object");
    }
    const parOnglet = onglets.map(onglet => entrainement.SEANCES.filter(seance => seance.onglet === onglet).length);
    assert.deepEqual(parOnglet, [8, 9, 4, 5, 2]);
});

test("besoinsEffectif repère l’attribut le plus faible du groupe", () => {
    const besoins = entrainement.besoinsEffectif(JOUEURS);
    assert.ok(besoins.profils >= 10);
    assert.ok(besoins.normalises.finishing > besoins.normalises.marking);
    assert.ok(besoins.normalises.off_the_ball > besoins.normalises.tackling);
    const meilleur = Object.entries(besoins.normalises).sort((a, b) => b[1] - a[1])[0][0];
    assert.ok(["finishing", "off_the_ball", "pace", "work_rate"].includes(meilleur));
});

test("profilTactique déduit les intentions du style de jeu", () => {
    const pressing = entrainement.profilTactique({ nom: "4-2-3-1", style: "Pressing haut, transition rapide" });
    assert.ok(pressing.has("pressing"));
    const possession = entrainement.profilTactique({ nom: "4-3-3", style: "Possession, construction patiente" });
    assert.ok(possession.has("possession"));
    const neutre = entrainement.profilTactique(null);
    assert.equal(neutre.size, 0);
});

test("phaseSaison suit le calendrier et le mois", () => {
    assert.equal(entrainement.phaseSaison("2027-07-01", [{ date: "2027-07-25" }]).id, "pre_saison");
    assert.equal(entrainement.phaseSaison("2027-08-10", [{ date: "2027-08-14" }]).id, "debut_saison");
    assert.equal(entrainement.phaseSaison("2027-11-10", [{ date: "2027-11-13" }]).id, "pleine_saison");
    assert.equal(entrainement.phaseSaison("2027-04-10", [{ date: "2027-04-13" }]).id, "fin_saison");
    assert.equal(entrainement.phaseSaison("2027-06-01", []).id, "coupure");
});

test("genererProgramme place une récupération avant chaque match et jamais le jour du match", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: CALENDRIER,
        joueurs: JOUEURS,
        tactique: { nom: "4-2-3-1", style: "Pressing haut, possession" },
        nbJours: 28
    });
    assert.ok(programme.cycles.length >= 2);
    const datesMatch = new Set(CALENDRIER.map(match => match.date));
    for (const cycle of programme.cycles) {
        assert.ok(cycle.jours.length > 0);
        for (const jour of cycle.jours) {
            assert.ok(!datesMatch.has(jour.date), `${jour.date} est un jour de match`);
            assert.equal(new Set(jour.seances.map(seance => seance.id)).size, jour.seances.length, "pas de doublon dans une journée");
        }
        const veille = cycle.jours[cycle.jours.length - 1];
        assert.equal(veille.avantMatch, 1);
        assert.ok(veille.seances.some(seance => seance.type === "recuperation"), "la veille est une récupération");
    }
});

test("genererProgramme varie les séances et cible les besoins de l’effectif", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: CALENDRIER,
        joueurs: JOUEURS,
        tactique: { nom: "4-2-3-1", style: "Pressing haut" },
        nbJours: 28
    });
    const developpement = programme.cycles
        .flatMap(cycle => cycle.jours)
        .filter(jour => jour.bloc === "developpement")
        .flatMap(jour => jour.seances);
    assert.ok(developpement.length > 0);
    const noms = developpement.map(seance => seance.nom);
    assert.ok(new Set(noms).size >= 3, "le développement ne répète pas la même séance");
    const offensif = developpement.some(seance => seance.id === "travail_offensif" || seance.id === "travail_possession");
    assert.ok(offensif, "les besoins offensifs de l’effectif sont travaillés");
    const prep = programme.cycles.flatMap(cycle => cycle.jours).filter(jour => jour.bloc === "preparation");
    assert.ok(prep.length > 0);
    assert.ok(prep.every(jour => jour.seances.some(seance => seance.onglet === "Préparation de match")));
});

test("les semaines sont regroupées et le CSV suit les jours générés", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: CALENDRIER,
        joueurs: JOUEURS,
        tactique: null,
        nbJours: 28
    });
    const semaines = entrainement.resumeSemaines(programme);
    assert.ok(semaines.length >= 2);
    for (const semaine of semaines) {
        const jour = entrainement.convertirDate(semaine.debut);
        assert.equal(jour.getDay(), 1, "une semaine commence le lundi");
    }
    const totalJours = programme.cycles.reduce((somme, cycle) => somme + cycle.jours.length, 0);
    const lignes = entrainement.csvProgramme(programme).split("\r\n");
    assert.equal(lignes[0], '"Date";"Jour";"Avant-match";"Bloc";"Séance 1";"Séance 2";"Séance 3";"Charge"');
    assert.equal(lignes.length, totalJours + 1);
    assert.equal(programme.metriques.jours, totalJours);
});

test("le programme retombe sur un cycle par défaut sans calendrier", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: [],
        joueurs: JOUEURS,
        tactique: null,
        nbJours: 7
    });
    assert.equal(programme.cycles.length, 1);
    assert.ok(programme.cycles[0].jours.length > 0);
    assert.equal(programme.phase.id, "coupure");
});

test("texteSaisie produit une liste jour par jour exploitable dans l’écran Entraînement", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: CALENDRIER,
        joueurs: JOUEURS,
        tactique: null,
        nbJours: 28
    });
    const semaine = entrainement.texteSaisie(programme, { debut: "2027-09-25", fin: "2027-10-01" });
    const blocs = semaine.split("\n\n");
    assert.equal(blocs.length, 5);
    assert.match(blocs[0], /J-\d/);
    assert.match(blocs[0], /1\. /);
    assert.match(blocs[0], /3\. /);
    assert.doesNotMatch(semaine, /undefined/);
    const tout = entrainement.texteSaisie(programme);
    assert.ok(tout.split("\n\n").length > blocs.length);
    assert.equal(entrainement.texteSaisie(programme, { debut: "2028-01-01" }), "");
});

test("la grille .fmf est alignée sur les jours de la semaine", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: CALENDRIER,
        joueurs: JOUEURS,
        tactique: null,
        nbJours: 28
    });
    const semaines = entrainement.resumeSemaines(programme, CALENDRIER);
    assert.ok(semaines.length > 0);
    for (const semaine of semaines) {
        assert.equal(semaine.jours.length, 7, "une semaine compte sept jours, du lundi au dimanche");
        const debut = entrainement.convertirDate(semaine.debut);
        assert.equal(debut.getDay(), 1, "la semaine commence le lundi");
        const grille = entrainement.grilleFm27(semaine);
        assert.equal(grille.length, 7);
        for (let rang = 0; rang < 7; rang += 1) {
            const date = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + rang);
            const jour = semaine.jours.find(candidat => candidat.date === entrainement.formaterDate(date));
            assert.ok(jour, `jour de rang ${rang} présent`);
            const attendu = [0, 1, 2].map(place =>
                (jour.seances[place] ? entrainement.codeFm27(jour.seances[place].id) : 300));
            assert.deepEqual(grille[rang], attendu, `créneaux du jour de rang ${rang}`);
        }
    }
    const avecMatch = semaines.find(semaine => semaine.jours.some(jour => jour.avantMatch === 0));
    assert.ok(avecMatch, "une semaine contient une journée de match");
    const jourMatch = avecMatch.jours.find(jour => jour.avantMatch === 0);
    assert.deepEqual(jourMatch.seances, [], "la journée de match ne porte aucune séance");
    assert.deepEqual(entrainement.grilleFm27(avecMatch)[avecMatch.jours.indexOf(jourMatch)], [300, 300, 300]);
});
test("le lendemain de chaque match est une journée de récupération", () => {
    const programme = entrainement.genererProgramme({
        dateDebut: "2027-09-25",
        calendrier: CALENDRIER,
        joueurs: JOUEURS,
        tactique: null,
        nbJours: 28
    });
    const jours = programme.cycles.flatMap(cycle => cycle.jours);
    const parDate = new Map(jours.map(jour => [jour.date, jour]));
    let verifies = 0;
    for (const match of CALENDRIER) {
        const date = entrainement.convertirDate(match.date);
        const lendemain = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        const jour = parDate.get(entrainement.formaterDate(lendemain));
        if (!jour) continue;
        verifies += 1;
        assert.equal(jour.bloc, "recuperation",
            `${jour.date} suit le match du ${match.date} : le lendemain doit être une récupération`);
        assert.equal(jour.seances.length, 1, `${jour.date} ne porte qu'une séance de récupération`);
        assert.ok(jour.seances.every(seance => seance.type === "recuperation"),
            `${jour.date} ne contient que des séances de récupération`);
    }
    assert.ok(verifies >= 3, "plusieurs lendemains de match ont été vérifiés");
    const joursRecuperation = jours.filter(jour => jour.bloc === "recuperation").length;
    assert.ok(joursRecuperation >= 6, "le programme ménage des jours de récupération");
});
