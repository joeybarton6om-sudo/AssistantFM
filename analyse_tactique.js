(function (global) {
    "use strict";

    const ZONES = [
        { id: "gardien", nom: "Gardien", sessions: ["gk"], types: ["gardien"], poids: 0.7 },
        { id: "defense", nom: "Défense", sessions: ["defensif", "bloc_defensif", "placement_defensif", "engagement_defensif"], types: ["defense", "pressing"], poids: 1.0 },
        { id: "milieu", nom: "Milieu / construction", sessions: ["construction", "style_passes", "organisation_ballon", "possession", "progression"], types: ["possession", "construction"], poids: 1.0 },
        { id: "creation", nom: "Création / finition", sessions: ["creation_occasions", "trente_derniers_metres", "passes_decisives", "tirs"], types: ["attaque", "creation"], poids: 1.0 },
        { id: "pressing", nom: "Pressing / transitions", sessions: ["hauteur_pressing", "intensite_pressing", "piege_pressing", "contre_pressing"], types: ["pressing", "transition"], poids: 0.95 },
        { id: "physique", nom: "Physique", sessions: ["condition", "endurance", "force", "vitesse"], types: ["physique"], poids: 0.85 }
    ];

    const PRIORITES_PAR_STYLE = {
        possession: { construction: 1, organisation_ballon: 0.9, style_passes: 0.8, creation_occasions: 0.7, intensite_pressing: 0.5 },
        gegenpress: { intensite_pressing: 1, hauteur_pressing: 0.95, piege_pressing: 0.85, condition: 0.8, transitions: 0.7 },
        pressing: { intensite_pressing: 1, hauteur_pressing: 0.9, piege_pressing: 0.8, transitions: 0.6 },
        vertical: { transitions: 1, progression: 0.85, finition: 0.8, contre_pression: 0.6 },
        direct: { progression: 0.9, finition: 0.85, jeu_aerien: 0.7, duels: 0.6 },
        contre: { organisation_defensive: 1, transitions: 0.95, finition: 0.7, bloc_bas: 0.8 },
        defensif: { bloc_defensif: 1, placement_defensif: 0.9, engagement_defensif: 0.8, concentration: 0.7 },
        standard: { construction: 0.7, creation_occasions: 0.7, intensite_pressing: 0.6, organisation_defensive: 0.6 }
    };

    function txt(v) { return String(v == null ? "" : v).toLowerCase(); }

    function joueursClub(data) {
        const j = Array.isArray(data && data.joueurs) ? data.joueurs : [];
        const club = j.filter(x => x && x.est_mon_club === true);
        return club.length ? club : j;
    }

    function positionsJoueur(joueur) {
        if (typeof global.positionsProfil === "function") return global.positionsProfil(joueur);
        const src = joueur && joueur.positions && typeof joueur.positions === "object" ? joueur.positions : {};
        return Object.keys(src).map(k => ({ key: k, rating: Number(src[k]) })).filter(p => Number.isFinite(p.rating));
    }

    function nomPosteSafe(pos) {
        if (typeof global.nomPoste === "function") return global.nomPoste(pos);
        return String(pos || "");
    }

    function noteRoleSafe(joueur, role, position) {
        if (typeof global.noteRole === "function") return Number(global.noteRole(joueur, role, position));
        return NaN;
    }

    function rolesPossibles(position) {
        const map = global.rolesParPoste || {};
        return map[position] || map[String(position || "").toLowerCase()] || [];
    }

    function meilleurPourSlot(joueur, position, roleIds) {
        const roles = global.roles || {};
        let best = null;
        for (const id of (roleIds || [])) {
            const role = roles[id];
            if (!role) continue;
            const score = noteRoleSafe(joueur, role, position);
            if (Number.isFinite(score) && (!best || score > best.score)) best = { roleId: id, role, score };
        }
        if (!best) {
            const ids = rolesPossibles(position);
            for (const id of ids) {
                const role = roles[id]; if (!role) continue;
                const score = noteRoleSafe(joueur, role, position);
                if (Number.isFinite(score) && (!best || score > best.score)) best = { roleId: id, role, score };
            }
        }
        return best;
    }

    function slotsTactique(tactique) {
        const postes = Array.isArray(tactique && tactique.postes) ? tactique.postes : [];
        return postes.map((slot, idx) => {
            const avec = Array.isArray(slot.avec_ball) ? slot.avec_ball[0] : slot.avec_ball;
            const sans = Array.isArray(slot.sans_ball) ? slot.sans_ball[0] : slot.sans_ball;
            const pos = avec || sans || slot.position || slot.poste || "";
            return { index: idx, slot, position: String(pos || "").toLowerCase(), avec, sans };
        }).filter(s => s.position);
    }

    function adequationTactique(tactique, data) {
        if (!tactique) return null;
        const joueurs = joueursClub(data);
        const slots = slotsTactique(tactique);
        const roles = global.roles || {};
        const used = new Set();
        const details = [];
        for (const s of slots) {
            const roleIds = rolesPossibles(s.position);
            let bestPlayer = null, bestFit = null;
            for (const j of joueurs) {
                const uid = j.uid != null ? String(j.uid) : (j.id != null ? String(j.id) : j.nom);
                if (used.has(uid)) continue;
                const fit = meilleurPourSlot(j, s.position, roleIds);
                if (fit && (!bestFit || fit.score > bestFit.score)) { bestFit = fit; bestPlayer = j; }
            }
            if (bestPlayer) {
                const uid = bestPlayer.uid != null ? String(bestPlayer.uid) : (bestPlayer.id != null ? String(bestPlayer.id) : bestPlayer.nom);
                used.add(uid);
            }
            const score = bestFit ? bestFit.score : 0;
            details.push({
                index: s.index,
                position: s.position,
                nomPoste: nomPosteSafe(s.position),
                joueur: bestPlayer ? (bestPlayer.nom || bestPlayer.name || "") : null,
                joueurUid: bestPlayer ? (bestPlayer.uid ?? bestPlayer.id) : null,
                role: bestFit ? (bestFit.role.nom || bestFit.roleId) : null,
                score: Math.round(score * 10) / 10,
                niveau: score >= 14 ? "fort" : score >= 11 ? "correct" : score >= 8 ? "faible" : "critique"
            });
        }
        const scores = details.map(d => d.score);
        const moyenne = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
        const minimum = scores.length ? Math.min(...scores) : 0;
        const couverture = details.filter(d => d.joueur).length;
        const critiques = details.filter(d => d.niveau === "critique" || d.niveau === "faible");
        const parLigne = {};
        for (const d of details) {
            const p = txt(d.position);
            const ligne = p === "gk" ? "Gardien" : /^d|wb|sw/.test(p) ? "Défense" : /^(dm|m|am)/.test(p) ? "Milieu" : "Attaque";
            (parLigne[ligne] = parLigne[ligne] || []).push(d);
        }
        const lignes = Object.keys(parLigne).map(nom => {
            const arr = parLigne[nom];
            const moy = arr.reduce((a,b)=>a+b.score,0)/(arr.length||1);
            return { nom, moyenne: Math.round(moy*10)/10, nb: arr.length };
        });
        return {
            tactique: { id: tactique.id, nom: tactique.nom || tactique.name, style: tactique.style, mentalite: tactique.mentalite },
            moyenne: Math.round(moyenne * 10) / 10,
            minimum: Math.round(minimum * 10) / 10,
            noteSur100: Math.max(0, Math.min(100, Math.round(moyenne * 5))),
            couverture,
            total: slots.length || details.length,
            details,
            critiques,
            lignes,
            resume: moyenne >= 14 ? "Très bonne adéquation" : moyenne >= 11.5 ? "Adéquation correcte" : moyenne >= 9 ? "Adéquation moyenne, axes à travailler" : "Adéquation faible, adaptation nécessaire"
        };
    }

    function motsStyle(tactique) {
        const s = [txt(tactique && tactique.style), txt(tactique && tactique.mentalite), txt(tactique && tactique.nom)].join(" ");
        return s;
    }

    function prioritesTactiques(tactique, adequation) {
        const s = motsStyle(tactique);
        const base = {};
        const add = (k, v) => { base[k] = Math.max(base[k] || 0, v); };
        if (/possess|control|patient|court|tiki/.test(s)) { add("construction", 0.95); add("organisation_ballon", 0.9); add("style_passes", 0.85); add("creation_occasions", 0.7); }
        if (/press|gegen|intens|haute/.test(s)) { add("intensite_pressing", 1); add("hauteur_pressing", 0.9); add("piege_pressing", 0.8); add("condition", 0.75); }
        if (/contre|transition|direct|vertical|rapide/.test(s)) { add("transitions", 0.95); add("progression", 0.8); add("finition", 0.75); }
        if (/defens|bloc|bas|prudent|caten/.test(s)) { add("bloc_defensif", 1); add("placement_defensif", 0.9); add("engagement_defensif", 0.8); }
        if (/ailier|large|centre|cross/.test(s)) { add("centres", 0.85); add("jeu_aerien", 0.7); add("creation_occasions", 0.75); }
        if (/fluide|offens|attaque/.test(s)) { add("creation_occasions", 0.9); add("mouvements", 0.8); add("finition", 0.75); }
        if (!Object.keys(base).length) { add("construction", 0.7); add("intensite_pressing", 0.65); add("creation_occasions", 0.7); add("organisation_defensive", 0.65); }
        if (adequation && adequation.lignes) {
            for (const l of adequation.lignes) {
                const deficit = Math.max(0, 13 - l.moyenne) / 13;
                if (deficit <= 0) continue;
                if (l.nom === "Défense") { add("bloc_defensif", 0.6 + deficit * 0.4); add("placement_defensif", 0.55 + deficit * 0.35); }
                if (l.nom === "Milieu") { add("construction", 0.6 + deficit * 0.4); add("style_passes", 0.55 + deficit * 0.3); }
                if (l.nom === "Attaque") { add("creation_occasions", 0.6 + deficit * 0.4); add("finition", 0.55 + deficit * 0.35); }
            }
        }
        const items = Object.keys(base).map(k => ({ id: k, score: Math.round(base[k] * 100) / 100 }));
        items.sort((a,b)=>b.score-a.score);
        const max = items[0] ? items[0].score : 1;
        return items.slice(0, 6).map(it => ({ ...it, niveau: Math.round((it.score / max) * 100) }));
    }

    function signatureCalendrier(calendrier) {
        const cal = Array.isArray(calendrier) ? calendrier : [];
        return cal.map(m => [m.date, m.adversaire, m.competition, m.lieu, m.maison].join("|")).sort().join("||") + "#" + cal.length;
    }

    function prochainsMatchs(calendrier, dateRef, n) {
        const ref = dateRef ? new Date(dateRef) : new Date();
        const cal = Array.isArray(calendrier) ? calendrier : [];
        return cal
            .map(m => ({ ...m, _d: m && m.date ? new Date(m.date) : null }))
            .filter(m => m._d && !isNaN(m._d) && m._d >= new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()))
            .sort((a,b)=>a._d-b._d)
            .slice(0, n || 10)
            .map(m => ({ date: m.date, adversaire: m.adversaire, competition: m.competition, lieu: m.lieu, maison: m.maison }));
    }

    global.AssistantFMAnalyseTactique = {
        adequationTactique,
        prioritesTactiques,
        signatureCalendrier,
        prochainsMatchs,
        joueursClub
    };
})(typeof window !== "undefined" ? window : globalThis);
