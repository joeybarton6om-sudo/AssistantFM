"""Genere un fichier modele .fmf minimal pour l'export de plannings FM27.

Ce fichier sert de squelette lorsque l'utilisateur n'a encore aucun
planning .fmf dans son dossier schedules. Il contient les ressources
minimales : .tsc (grille vide), _data/details.aom (details), image.img.
"""

from __future__ import annotations

import os
import struct
import sys
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

try:
    from compression import zstd
except ImportError:
    import zstandard as zstd

MALIGNE_ANNONCE = b"fmf."
DECALAGE_DONNEES = 26
SOUS_EN_TETE = 17

CONTAINER_HEADER = bytes([0x02, 0x01]) + b"afe." + bytes([0x08, 0x00, 0x00])
FMF_HEADER = bytes([0x00, 0x00]) + b"fmf." + bytes([0x00, 0x00, 0x00])


def _ecrire_chaine(texte: str) -> bytes:
    octets = texte.encode("utf-8")
    return struct.pack("<I", len(octets)) + octets


def _ctr(cle: bytes, iv: bytes, flux: bytes) -> bytes:
    dechiffreur = Cipher(algorithms.AES(cle), modes.CTR(iv)).encryptor()
    return dechiffreur.update(flux) + dechiffreur.finalize()


def _chiffrer_ressource(cle: bytes, iv: bytes, clair: bytes) -> bytes:
    donnees = zstd.compress(bytes(clair), 3)
    return _ctr(cle, iv, donnees)


def _construire_grille() -> bytes:
    """Construit le clair d'une ressource .tsc : 7 jours de repos."""
    clair = bytearray()
    for _jour in range(7):
        clair.append(0x04)
        for _slot in range(3):
            clair.extend(struct.pack("<H", 0))  # code 0 = repos
        clair.append(0x00)
    description = b"Planning AssistantFM"
    clair.extend(struct.pack("<I", len(description)))
    clair.extend(description)
    return bytes(clair)


def _construire_details(nom: str) -> bytes:
    """Construit le clair d'une ressource _data/details.aom."""
    clair = bytearray(8)  # entete 8 octets
    type_octets = b"planning"
    clair.extend(struct.pack("<I", len(type_octets)))
    clair.extend(type_octets)
    nom_octets = nom.encode("utf-8")
    clair.extend(struct.pack("<I", len(nom_octets)))
    clair.extend(nom_octets)
    return bytes(clair)


def generer(modele_path: Path, nom: str = "AssistantFM") -> None:
    cle_tsc = os.urandom(16)
    iv_tsc = os.urandom(16)
    cle_aom = os.urandom(16)
    iv_aom = os.urandom(16)
    cle_img = os.urandom(16)
    iv_img = os.urandom(16)

    grille_clair = _construire_grille()
    details_clair = _construire_details(nom)
    img_clair = b"\x00" * 10

    grille_chiffree = _chiffrer_ressource(cle_tsc, iv_tsc, grille_clair)
    details_chiffree = _chiffrer_ressource(cle_aom, iv_aom, details_clair)
    img_chiffree = _chiffrer_ressource(cle_img, iv_img, img_clair)

    # Enregistrements : entete 40 octets (4+4+16+16) + donnees chiffrees
    ent_tsc = struct.pack("<II", 16, 16) + cle_tsc + iv_tsc + grille_chiffree
    ent_aom = struct.pack("<II", 16, 16) + cle_aom + iv_aom + details_chiffree
    ent_img = struct.pack("<II", 16, 16) + cle_img + iv_img + img_chiffree

    records = ent_tsc + ent_aom + ent_img

    # Section : u64 taille (auto-ref) + 9 octets padding (SOUS_EN_TETE=17 total) + records
    taille_section = SOUS_EN_TETE + len(records)
    section = bytearray()
    section.extend(struct.pack("<Q", taille_section))  # u64 taille au debut de la section
    section.extend(bytearray(SOUS_EN_TETE - 8))  # padding pour atteindre 17 octets
    section.extend(records)
    struct.pack_into("<Q", section, 0, taille_section)  # confirmer la taille

    # Arbre du manifest
    fichiers = [
        {"nom": nom, "ext": ".tsc", "offset": 0, "taille": len(ent_tsc),
         "brut": len(grille_clair), "t1": 0, "t2": 0},
        {"nom": "_data/details", "ext": ".aom", "offset": len(ent_tsc),
         "taille": len(ent_aom), "brut": len(details_clair), "t1": 0, "t2": 0},
        {"nom": "image", "ext": ".img", "offset": len(ent_tsc) + len(ent_aom),
         "taille": len(ent_img), "brut": len(img_clair), "t1": 0, "t2": 0},
    ]
    dossiers = []

    def _ecrire_noeud(noeud) -> bytes:
        morceaux = [struct.pack("<I", len(noeud["fichiers"]))]
        for f in noeud["fichiers"]:
            morceaux.append(_ecrire_chaine(f["nom"]) + _ecrire_chaine(f["ext"]))
            morceaux.append(struct.pack("<QQQqq",
                f["offset"], f["taille"], f["brut"], f.get("t1", 0), f.get("t2", 0)))
        morceaux.append(struct.pack("<I", len(noeud["dossiers"])))
        for d in noeud["dossiers"]:
            morceaux.append(_ecrire_chaine(d["nom"]))
            morceaux.append(_ecrire_noeud(d))
        return b"".join(morceaux)

    arbre = {"fichiers": fichiers, "dossiers": dossiers}
    manifeste = _ecrire_chaine(nom) + _ecrire_noeud(arbre)
    manifeste_compresse = zstd.compress(manifeste, 3)

    # Assemblage final : en-tete container + section + en-tete fmf + manifest zstd
    donnees = bytearray()
    donnees.extend(CONTAINER_HEADER)           # 9 octets (file 0-8)
    donnees.extend(section)                     # section (file 9+)
    donnees.extend(FMF_HEADER)                  # 9 octets "fmf."
    donnees.extend(manifeste_compresse)         # manifest zstd

    modele_path.parent.mkdir(parents=True, exist_ok=True)
    modele_path.write_bytes(donnees)
    print(f"Modele cree : {modele_path} ({len(donnees)} octets)")


if __name__ == "__main__":
    cible = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("modeles/squelette.fmf")
    nom = sys.argv[2] if len(sys.argv) > 2 else "AssistantFM"
    generer(cible, nom)
