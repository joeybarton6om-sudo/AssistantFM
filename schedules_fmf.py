"""Lecture des fichiers de planning d'entrainement .fmf de Football Manager 27.

Un fichier .fmf est un conteneur « afe » : un en-tete de 9 octets
(02 01 "afe." 08 00 00), un u64 donnant la taille de la section, la section,
puis un en-tete « fmf » de 9 octets suivi d'une frame zstd contenant l'annuaire.

Chaque ressource de l'annuaire est un enregistrement
`u32 longueur_cle, u32 longueur_iv, cle[16], iv[16], flux AES-128-CTR`, dont le
clair est une frame zstd. Le planning lui-meme est la ressource `.tsc` : 7 jours
de 3 creneaux a partir de l'offset 14, chaque creneau etant un code de seance
(u16), puis un u32 et la description UTF-8.

L'ecriture est traitee par `ecrire_fmf.py` (reprise d'un modele reel, puis
rechiffrement et recompression de la seule ressource modifiee).
"""

from __future__ import annotations

import json
import os
import struct
import sys
from datetime import date, datetime
from pathlib import Path

try:
    from compression import zstd
except ImportError:  # pragma: no cover
    zstd = None

MALIGNE_ZSTD = b"\x28\xb5\x2f\xfd"
EXTENSIONS_CONNUES = {".img", ".tsc", ".aom"}


def _lire_chaine(donnees: bytes, curseur: int) -> tuple[str, int]:
    if curseur + 4 > len(donnees):
        return "", curseur
    taille = struct.unpack_from("<I", donnees, curseur)[0]
    curseur += 4
    fin = min(curseur + taille, len(donnees))
    return donnees[curseur:fin].decode("utf-8", "replace"), fin


def lire_annuaire(donnees: bytes) -> dict:
    """Decompose l'annuaire zstd d'un fichier .fmf."""
    nom, curseur = _lire_chaine(donnees, 0)
    if curseur + 4 > len(donnees):
        return {"nom": nom, "ressources": [], "brut": donnees}
    nombre = struct.unpack_from("<I", donnees, curseur)[0]
    curseur += 4
    ressources = []
    for _ in range(max(0, min(nombre, 64))):
        type_chef, curseur = _lire_chaine(donnees, curseur)
        extension, curseur = _lire_chaine(donnees, curseur)
        if curseur + 40 > len(donnees):
            break
        valeurs = struct.unpack_from("<QQQ", donnees, curseur)
        curseur += 24
        suites = struct.unpack_from("<QQ", donnees, curseur)
        curseur += 16
        ressources.append({
            "type": type_chef,
            "extension": extension,
            "valeurs": list(valeurs),
            "suites": list(suites),
        })
    return {"nom": nom, "ressources": ressources, "brut": donnees}


def lire_fichier(chemin: str | os.PathLike) -> dict:
    """Lit un fichier .fmf : en-tete, annuaire et tailles des blocs."""
    donnees = Path(chemin).read_bytes()
    position = donnees.find(MALIGNE_ZSTD)
    resultat = {
        "fichier": Path(chemin).name,
        "taille": len(donnees),
        "signature": donnees[:6].hex(),
        "zstd": position,
        "nom": "",
        "ressources": [],
        "erreur": None,
        "modifie": datetime.fromtimestamp(Path(chemin).stat().st_mtime).isoformat(timespec="seconds"),
    }
    if zstd is None:
        resultat["erreur"] = "compression.zstd indisponible"
        return resultat
    if position < 0:
        resultat["erreur"] = "aucune section zstd"
        return resultat
    try:
        annuaire = zstd.decompress(donnees[position:])
    except Exception as erreur:  # zstd.ZstdError
        resultat["erreur"] = str(erreur)
        return resultat
    decompose = lire_annuaire(annuaire)
    resultat["nom"] = decompose["nom"]
    resultat["ressources"] = decompose["ressources"]
    resultat["annuaire"] = len(annuaire)
    return resultat


def lire_dossier(dossier: str | os.PathLike) -> list[dict]:
    chemin = Path(dossier)
    if not chemin.is_dir():
        return []
    fichiers = []
    for entree in sorted(chemin.glob("*.fmf")):
        try:
            fichiers.append(lire_fichier(entree))
        except OSError as erreur:
            fichiers.append({"fichier": entree.name, "erreur": str(erreur)})
    return fichiers


def comparer(premier: str | os.PathLike, second: str | os.PathLike) -> dict:
    """Compare deux fichiers .fmf bloc par bloc (analyse differentielle)."""
    a = Path(premier).read_bytes()
    b = Path(second).read_bytes()
    commun = min(len(a), len(b))
    divergences = [i for i in range(commun) if a[i] != b[i]]
    plages = []
    for index in divergences:
        if plages and index - plages[-1][1] <= 2:
            plages[-1][1] = index
        else:
            plages.append([index, index])
    return {
        "taille_premier": len(a),
        "taille_second": len(b),
        "octets divergents": len(divergences),
        "plages": [{"debut": debut, "fin": fin, "longueur": fin - debut + 1} for debut, fin in plages],
    }


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage : python schedules_fmf.py <fichier.fmf | dossier> [--comparer a.fmf b.fmf]")
        return 1
    if argv[1] == "--comparer" and len(argv) >= 4:
        print(json.dumps(comparer(argv[2], argv[3]), ensure_ascii=False, indent=2))
        return 0
    cible = Path(argv[1])
    if cible.is_dir():
        print(json.dumps(lire_dossier(cible), ensure_ascii=False, indent=2))
    else:
        print(json.dumps(lire_fichier(cible), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))