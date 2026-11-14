with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''const erreurFiltresRecrutement = erreurReputation ? "Vérifiez l'écart de réputation maximum." : "";
    // Filtre genre : auto (club géré), hommes (0), femmes (1)
    const genderFilter = document.getElementById("gender-filter")?.value;
    let effectiveGender = null;
    if (genderFilter === "") {
        // Auto : utiliser le genre du club géré
        effectiveGender = rawData.club_gere_gender;
    } else if (genderFilter !== "") {
        effectiveGender = Number(genderFilter);
    }
    // Construire un map club_uid -> gender pour les joueurs
    const clubGenderMap = new Map();
    if (rawData.clubs) {
        rawData.clubs.forEach(club => {
            if (club.gender !== undefined && club.gender !== null) {
                clubGenderMap.set(club.uid, club.gender);
            }
        });
    }
    listAct = source.filter(person => {
        if (mode !== "staff" && (erreurFiltres || !correspondAuxFiltresJoueur(person, filtresAttributs.criteres))) return false;
        if (erreurFiltresRecrutement) return false;
        if (mode === "joueurs" && person.est_mon_club !== true
            && reputationClub !== null && estNombre(person.reputation)
            && Number(person.reputation) > reputationClub + margeReputation) return false;
        if (mode !== "staff" && monClub && person.est_mon_club !== true) {
            return false;
        }
        // Filtre genre : seulement si effectiveGender est défini (0 ou 1)
        if (mode === "joueurs" && effectiveGender !== null && effectiveGender !== undefined) {
            const clubGender = clubGenderMap.get(person.club_uid);
            if (clubGender !== effectiveGender) return false;
        }'''

new_code = '''const erreurFiltresRecrutement = erreurReputation ? "Vérifiez l'écart de réputation maximum." : "";
    // Filtre genre : automatique selon le club géré (si connu)
    const effectiveGender = rawData.club_gere_gender;
    // Construire un map club_uid -> gender pour les joueurs
    const clubGenderMap = new Map();
    if (rawData.clubs) {
        rawData.clubs.forEach(club => {
            if (club.gender !== undefined && club.gender !== null) {
                clubGenderMap.set(club.uid, club.gender);
            }
        });
    }
    listAct = source.filter(person => {
        if (mode !== "staff" && (erreurFiltres || !correspondAuxFiltresJoueur(person, filtresAttributs.criteres))) return false;
        if (erreurFiltresRecrutement) return false;
        if (mode === "joueurs" && person.est_mon_club !== true
            && reputationClub !== null && estNombre(person.reputation)
            && Number(person.reputation) > reputationClub + margeReputation) return false;
        if (mode !== "staff" && monClub && person.est_mon_club !== true) {
            return false;
        }
        // Filtre genre automatique : seulement si club_gere_gender est défini (0 ou 1)
        if (mode === "joueurs" && effectiveGender !== null && effectiveGender !== undefined) {
            const clubGender = clubGenderMap.get(person.club_uid);
            if (clubGender !== effectiveGender) return false;
        }'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed app.js')
else:
    print('Pattern not found!')
    # Debug: show what's around line 1399
    idx = content.find('Filtre genre')
    if idx >= 0:
        print(repr(content[idx:idx+500]))