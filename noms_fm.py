import os
import re
import sys
from pathlib import Path


COMPETITIONS_CONNUS = {
    5123054: "National League North",
    2000095878: "National U18 League North East",
}


def dossiers_jeu():
    if sys.platform != "win32":
        return []
    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam") as cle:
            steam = Path(winreg.QueryValueEx(cle, "SteamPath")[0])
    except FileNotFoundError:
        return []

    bibliotheques = [steam]
    fichier = steam / "steamapps" / "libraryfolders.vdf"
    if fichier.is_file():
        texte = fichier.read_text(encoding="utf-8-sig")
        for chemin in re.findall(r'"path"\s+"((?:\\.|[^"])*)"', texte):
            bibliotheques.append(Path(chemin.replace("\\\\", "\\")))
    return [
        chemin / "steamapps" / "common" / "Football Manager 27"
        for chemin in dict.fromkeys(bibliotheques)
    ]


def noms_competitions(dossiers=None):
    noms = dict(COMPETITIONS_CONNUS)
    expression = re.compile(
        r'^"COMP_LONG_NAME_CHANGE"\s+(\d+)\s+"([^"]+)"\s+"([^"]*)"',
        re.IGNORECASE | re.MULTILINE,
    )
    corrections = []
    for jeu in dossiers_jeu() if dossiers is None else dossiers:
        repertoire = jeu / "shared" / "data" / "database" / "db" / "2700" / "lnc" / "all"
        if not repertoire.is_dir():
            continue
        for fichier in sorted(repertoire.glob("*.lnc")):
            contenu = fichier.read_bytes()
            if contenu.startswith((b"\xff\xfe", b"\xfe\xff")):
                texte = contenu.decode("utf-16")
            elif contenu.startswith(b"\xef\xbb\xbf"):
                texte = contenu.decode("utf-8-sig")
            else:
                try:
                    texte = contenu.decode("utf-8")
                except UnicodeDecodeError:
                    texte = contenu.decode("cp1252")
            corrections.extend(expression.findall(texte))

    for langue in ("", "French"):
        for identifiant, nom, langue_correction in corrections:
            if langue_correction.casefold() == langue.casefold():
                noms[int(identifiant)] = nom

    dossier_donnees = os.environ.get("ASSISTANT_FM_DATA_DIR")
    fichier_personnel = (
        Path(dossier_donnees) / "noms_competitions.csv"
        if dossier_donnees else Path(__file__).with_name("noms_competitions.csv")
    )
    if fichier_personnel.is_file():
        from fmsave import read_competition_names

        noms.update(read_competition_names(fichier_personnel))
    return noms
