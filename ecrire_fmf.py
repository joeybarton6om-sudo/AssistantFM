"""Ecriture de plannings .fmf pour Football Manager 27.

Conteneur « afe » : en-tete 9 octets (02 01 "afe." 08 00 00), un u64 donnant la
taille de la section, la section, puis un en-tete « fmf » de 9 octets suivi d'une
frame zstd contenant l'annuaire.

La section commence par un sous-en-tete de 17 octets, puis les enregistrements
de l'annuaire, dans l'ordre des offsets. Chaque enregistrement est
    u32 longueur_cle, u32 longueur_iv, cle[16], iv[16], flux AES-128-CTR
et son clair est une frame zstd.

L'annuaire est un arbre : un u32 (nombre de fichiers), puis par fichier
`chaine nom, chaine extension, u64 offset, u64 taille, u64 taille_claire,
i64 t1, i64 t2`, puis un u32 (nombre de sous-dossiers) et, par dossier,
`chaine nom` suivi du meme arbre.

Ressources d'un planning :
- `<nom>.tsc` : la grille. 7 jours x [octet 0x04, u16 matin, u16 apres-midi,
  u16 soir, octet 0] a partir de l'offset 14, puis un u32 (longueur) et la
  description UTF-8. Les codes de seance viennent de `training_sessions`.
- `_data/details.aom` : en-tete, type de planning, **nom affiche dans le jeu**,
  nom du manager, puis des champs opaques.
- `image.img` : vignette (10 octets nuls ici).
"""

from __future__ import annotations

import struct
import sys
from compression import zstd
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

MALIGNE_ANNONCE = b"fmf."
DECALAGE_DONNEES = 26
SOUS_EN_TETE = 17
GRILLE_DEBUT = 14
GRILLE_PAS = 8


def _lire_chaine(donnees: bytes, curseur: int) -> tuple[str, int]:
    taille = struct.unpack_from("<I", donnees, curseur)[0]
    curseur += 4
    return donnees[curseur:curseur + taille].decode("utf-8", "replace"), curseur + taille


def _ecrire_chaine(texte: str) -> bytes:
    octets = texte.encode("utf-8")
    return struct.pack("<I", len(octets)) + octets


def _lire_noeud(donnees: bytes, curseur: int) -> tuple[tuple[list, list], int]:
    fichiers = []
    nombre = struct.unpack_from("<I", donnees, curseur)[0]
    curseur += 4
    for _ in range(nombre):
        nom, curseur = _lire_chaine(donnees, curseur)
        extension, curseur = _lire_chaine(donnees, curseur)
        offset, taille, brut, t1, t2 = struct.unpack_from("<QQQqq", donnees, curseur)
        curseur += 40
        fichiers.append({"nom": nom, "ext": extension, "offset": offset,
                         "taille": taille, "brut": brut, "t1": t1, "t2": t2})
    dossiers = []
    sous = struct.unpack_from("<I", donnees, curseur)[0]
    curseur += 4
    for _ in range(sous):
        nom, curseur = _lire_chaine(donnees, curseur)
        enfant, curseur = _lire_noeud(donnees, curseur)
        dossiers.append({"nom": nom, "fichiers": enfant[0], "dossiers": enfant[1]})
    return (fichiers, dossiers), curseur


def _ecrire_noeud(noeud: dict) -> bytes:
    morceaux = [struct.pack("<I", len(noeud["fichiers"]))]
    for f in noeud["fichiers"]:
        morceaux.append(_ecrire_chaine(f["nom"]) + _ecrire_chaine(f["ext"]))
        morceaux.append(struct.pack("<QQQqq", f["offset"], f["taille"], f["brut"],
                                    f.get("t1", 0), f.get("t2", 0)))
    morceaux.append(struct.pack("<I", len(noeud["dossiers"])))
    for d in noeud["dossiers"]:
        morceaux.append(_ecrire_chaine(d["nom"]))
        morceaux.append(_ecrire_noeud(d))
    return b"".join(morceaux)


def _tous_les_fichiers(noeud: dict, prefixe: str = "") -> list[dict]:
    sortie = []
    for f in noeud["fichiers"]:
        f["chemin"] = prefixe + f["nom"] + f["ext"]
        sortie.append(f)
    for d in noeud["dossiers"]:
        sortie.extend(_tous_les_fichiers(d, prefixe + d["nom"] + "/"))
    return sortie


def _trouver(noeud: dict, suffixe: str) -> dict | None:
    for f in _tous_les_fichiers(noeud):
        if f["chemin"].endswith(suffixe):
            return f
    return None


def _ctr(cle: bytes, iv: bytes, flux: bytes) -> bytes:
    dechiffreur = Cipher(algorithms.AES(cle), modes.CTR(iv)).decryptor()
    return dechiffreur.update(flux) + dechiffreur.finalize()


def lire_conteneur(donnees: bytes) -> dict:
    type_ = donnees[2:6]
    if type_ not in (b"afe.", b"fmf."):
        raise ValueError("signature inconnue")
    taille_section = struct.unpack_from("<Q", donnees, 9)[0]
    debut_manifeste = 9 + taille_section
    if donnees[debut_manifeste + 2:debut_manifeste + 6] != MALIGNE_ANNONCE:
        raise ValueError("en-tete fmf absent")
    manifeste = zstd.decompress(donnees[debut_manifeste + 9:])
    racine, curseur = _lire_chaine(manifeste, 0)
    arbre, fin = _lire_noeud(manifeste, curseur)
    return {
        "type": type_,
        "taille_section": taille_section,
        "manifeste": manifeste,
        "manifeste_fin": fin,
        "racine": racine,
        "arbre": {"fichiers": arbre[0], "dossiers": arbre[1]},
        "chiffre": type_ == b"afe.",
    }


def _dechiffrer(modele: bytes, entree: dict) -> tuple[bytes, bytearray]:
    debut = DECALAGE_DONNEES + entree["offset"]
    enregistrement = modele[debut:debut + entree["taille"]]
    long_cle, long_iv = struct.unpack_from("<II", enregistrement, 0)
    cle = enregistrement[8:8 + long_cle]
    iv = enregistrement[8 + long_cle:8 + long_cle + long_iv]
    clair = bytearray(zstd.decompress(_ctr(cle, iv, enregistrement[8 + long_cle + long_iv:])))
    return (struct.pack("<II", long_cle, long_iv) + cle + iv), clair


def _rechiffrer(entete: bytes, cle: bytes, iv: bytes, clair: bytes) -> bytes:
    return entete + _ctr(cle, iv, zstd.compress(bytes(clair), 3))


def lire_ressource(conteneur: dict, donnees: bytes, suffixe: str) -> dict | None:
    entree = _trouver(conteneur["arbre"], suffixe)
    if entree is None:
        return None
    resultat = dict(entree)
    resultat["clair"] = _dechiffrer(donnees, entree)[1]
    return resultat


def lire_grille(clair: bytes) -> tuple[list[list[int]], str]:
    grille = []
    for jour in range(7):
        base = GRILLE_DEBUT + jour * GRILLE_PAS
        if clair[base] != 0x04:
            raise ValueError(f"balise de jour inattendue a l'offset {base}")
        grille.append([struct.unpack_from("<H", clair, base + 1 + 2 * k)[0] for k in range(3)])
    position = GRILLE_DEBUT + 7 * GRILLE_PAS
    longueur = struct.unpack_from("<I", clair, position)[0]
    description = clair[position + 4:position + 4 + longueur].decode("utf-8", "replace")
    return grille, description


def ecrire_grille(clair: bytearray, grille: list[list[int]]) -> None:
    if len(grille) != 7 or any(len(j) != 3 for j in grille):
        raise ValueError("la grille doit faire 7 jours de 3 creneaux")
    for jour, seances in enumerate(grille):
        base = GRILLE_DEBUT + jour * GRILLE_PAS
        clair[base] = 0x04
        for place, code in enumerate(seances):
            struct.pack_into("<H", clair, base + 1 + 2 * place, int(code))
        clair[base + 7] = 0


def lire_nom_aom(clair: bytes) -> str:
    """Nom du planning dans la ressource de details (`.aom`)."""
    curseur = 6 + 2
    taille_type = struct.unpack_from("<I", clair, curseur)[0]
    curseur += 4 + taille_type
    taille_nom = struct.unpack_from("<I", clair, curseur)[0]
    return clair[curseur + 4:curseur + 4 + taille_nom].decode("utf-8", "replace")


def ecrire_nom_aom(clair: bytearray, nom: str) -> None:
    curseur = 6 + 2
    taille_type = struct.unpack_from("<I", clair, curseur)[0]
    curseur += 4 + taille_type
    ancienne = struct.unpack_from("<I", clair, curseur)[0]
    octets = nom.encode("utf-8")
    clair[curseur:curseur + 4 + ancienne] = struct.pack("<I", len(octets)) + octets


def construire(modele: bytes, grille: list[list[int]], description: str | None = None,
               nouveau_nom: str | None = None) -> bytes:
    conteneur = lire_conteneur(modele)
    if not conteneur["chiffre"]:
        raise ValueError("le modele n'est pas un conteneur chiffre")
    entree = _trouver(conteneur["arbre"], ".tsc")
    if entree is None:
        raise ValueError("aucune ressource .tsc dans le modele")

    def modifier_grille(clair: bytearray) -> None:
        ecrire_grille(clair, grille)
        if description is not None:
            position = GRILLE_DEBUT + 7 * GRILLE_PAS
            ancien = struct.unpack_from("<I", clair, position)[0]
            octets = description.encode("utf-8")
            clair[position:position + 4 + ancien] = struct.pack("<I", len(octets)) + octets

    remplacements: dict[int, tuple[bytes, int]] = {}
    for cible, modif in ((entree, modifier_grille),):
        entete, clair = _dechiffrer(modele, cible)
        modif(clair)
        cle = entete[8:24]
        iv = entete[24:40]
        remplacements[id(cible)] = (_rechiffrer(entete, cle, iv, clair), len(clair))

    if nouveau_nom:
        details = _trouver(conteneur["arbre"], ".aom")
        if details is not None:
            entete, clair = _dechiffrer(modele, details)
            ecrire_nom_aom(clair, nouveau_nom)
            remplacements[id(details)] = (_rechiffrer(entete, entete[8:24], entete[24:40], clair), len(clair))

    for f in _tous_les_fichiers(conteneur["arbre"]):
        remplacement = remplacements.get(id(f))
        if remplacement is not None:
            f["taille"], f["brut"] = len(remplacement[0]), remplacement[1]

    originaux = {}
    for f in _tous_les_fichiers(conteneur["arbre"]):
        d = DECALAGE_DONNEES + f["offset"]
        originaux[id(f)] = modele[d:d + f["taille"]]

    ordre = sorted(_tous_les_fichiers(conteneur["arbre"]), key=lambda x: x["offset"])
    curseur = 0
    for f in ordre:
        f["offset"] = curseur
        curseur += f["taille"]

    if nouveau_nom:
        conteneur["racine"] = nouveau_nom
        entree["nom"] = nouveau_nom
        entree["chemin"] = entree["nom"] + entree["ext"]

    taille_section = struct.unpack_from("<Q", modele, 9)[0]
    section = modele[9:9 + taille_section]
    blocs = []
    for f in ordre:
        remplacement = remplacements.get(id(f))
        if remplacement is not None:
            blocs.append(remplacement[0])
            continue
        d = DECALAGE_DONNEES + f["offset"]
        blocs.append(originaux[id(f)])

    nouvelle_section = bytearray(section[:SOUS_EN_TETE] + b"".join(blocs))
    struct.pack_into("<Q", nouvelle_section, 0, len(nouvelle_section))

    manifeste = _ecrire_chaine(conteneur["racine"]) + _ecrire_noeud(conteneur["arbre"])
    enTeteFmf = modele[9 + taille_section:9 + taille_section + 9]
    return modele[:9] + bytes(nouvelle_section) + enTeteFmf + zstd.compress(manifeste, 3)


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print("Usage : python ecrire_fmf.py <modele.fmf> <sortie.fmf> [--nom NOM] [--description TEXTE]")
        return 1
    modele = Path(argv[1]).read_bytes()
    nom = None
    description = None
    for i, argument in enumerate(argv[3:], start=3):
        if argument == "--nom":
            nom = argv[i + 1]
        elif argument == "--description":
            description = argv[i + 1]
    conteneur = lire_conteneur(modele)
    entree = _trouver(conteneur["arbre"], ".tsc")
    grille, _ = lire_grille(_dechiffrer(modele, entree)[1])
    Path(argv[2]).write_bytes(construire(modele, grille, description, nom))
    print(f"{argv[2]} ecrit")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))