const prefixesDonneesLocales = ["assistantfm-suivi-v1:", "assistantfm-alertes-v1-", "assistantfm-ca-", "assistantfm-roles-v1:", "assistantfm-evolution-v1:", "assistantfm-colonnes-v1:", "assistantfm-couleurs-club-v1:", "assistantfm-outils-v1:"];
const cleProfilPartie = "assistantfm-profil-partie";

function profilPartie() {
    return localStorage.getItem(cleProfilPartie) || "";
}

function clePourPartie(cle) {
    const profil = profilPartie();
    return profil ? `assistantfm-partie:${encodeURIComponent(profil)}:${cle}` : cle;
}

