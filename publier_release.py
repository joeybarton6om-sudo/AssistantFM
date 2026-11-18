"""Publie une version d'Assistant FM sur le dépôt de releases GitHub.

Le corps de la release est lu et envoyé en UTF-8 explicite : une lecture avec
l'encodage par défaut de Windows (cp1252) transforme « AMÉLIORATION » en
« AMÃ‰LIORATION » dans la notification Discord.

Exemples :
    python publier_release.py --version 1.0.23-beta --exe dist\\AssistantFM-27-Setup.exe
    python publier_release.py --version 1.0.22-beta --exe dist\\AssistantFM-27-Setup.exe --corps-seulement
    python publier_release.py --version 1.0.21-beta --exe AssistantFM-27-Setup.exe --titre "Assistant FM 27 - v1.0.21-beta (version de retour)"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent
DEPOT_PAR_DEFAUT = "joeybarton6om-sudo/releases"
API = "https://api.github.com"
ENVOI = "https://uploads.github.com"


def jeton() -> str:
    """Récupère le jeton GitHub depuis l'environnement ou le gestionnaire Git."""
    for variable in ("GITHUB_TOKEN", "GH_TOKEN"):
        valeur = os.environ.get(variable)
        if valeur:
            return valeur.strip()
    essai = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True,
        text=True,
    )
    for ligne in essai.stdout.splitlines():
        if ligne.startswith("password="):
            return ligne[len("password="):].strip()
    raise SystemExit("Aucun jeton GitHub trouvé (GITHUB_TOKEN ou gestionnaire d'identifiants).")


def requete(url: str, methode: str, auth: str, charge: bytes | None = None,
            type_contenu: str = "application/json") -> dict:
    requete_http = urllib.request.Request(url, data=charge, method=methode)
    requete_http.add_header("Authorization", f"Bearer {auth}")
    requete_http.add_header("Accept", "application/vnd.github+json")
    requete_http.add_header("User-Agent", "assistantfm-publier")
    requete_http.add_header("X-GitHub-Api-Version", "2022-11-28")
    if charge is not None:
        requete_http.add_header("Content-Type", type_contenu)
    try:
        with urllib.request.urlopen(requete_http, timeout=300) as reponse:
            corps = reponse.read()
    except urllib.error.HTTPError as erreur:
        detail = erreur.read().decode("utf-8", "replace")[:400]
        raise SystemExit(f"{methode} {url} -> HTTP {erreur.code} : {detail}")
    return json.loads(corps.decode("utf-8")) if corps else {}


def lire_manifeste(version: str) -> dict:
    chemin = RACINE / "version.json"
    return json.loads(chemin.read_text(encoding="utf-8"))


def corps_defaut(version: str, manifeste: dict) -> str:
    if manifeste.get("version") == version:
        return manifeste.get("changelog", "")
    return f"Version {version}."


def normaliser(version: str) -> str:
    return version if version.startswith("v") else f"v{version}"


def publier(arguments: argparse.Namespace) -> dict:
    auth = jeton()
    depot = arguments.depot
    tag = normaliser(arguments.version)
    manifeste = lire_manifeste(arguments.version)
    corps = arguments.corps
    if corps is None and arguments.corps_fichier:
        corps = Path(arguments.corps_fichier).read_text(encoding="utf-8")
    if corps is None:
        corps = corps_defaut(arguments.version, manifeste)
    titre = arguments.titre or f"Assistant FM 27 - {tag}"

    existante = None
    try:
        existante = requete(f"{API}/repos/{depot}/releases/tags/{tag}", "GET", auth)
    except SystemExit:
        existante = None

    charge = json.dumps({
        "tag_name": tag,
        "name": titre,
        "body": corps,
        "prerelease": arguments.prerelease,
        "draft": arguments.draft,
    }, ensure_ascii=False).encode("utf-8")

    if existante:
        release = requete(f"{API}/repos/{depot}/releases/{existante['id']}", "PATCH", auth, charge)
        print(f"release {tag} mise à jour : {release['html_url']}")
    else:
        release = requete(f"{API}/repos/{depot}/releases", "POST", auth, charge)
        print(f"release {tag} créée : {release['html_url']}")

    if arguments.corps_seulement:
        return release

    exe = Path(arguments.exe)
    if not exe.is_file():
        raise SystemExit(f"Installeur introuvable : {exe}")
    actifs = requete(f"{API}/repos/{depot}/releases/{release['id']}/assets", "GET", auth)
    deja_la = [a for a in actifs if a.get("name") == exe.name]
    if deja_la and deja_la[0].get("size") == exe.stat().st_size:
        print(f"asset {exe.name} déjà à jour ({exe.stat().st_size} octets)")
        return release
    for actif in deja_la:
        requete(f"{API}/repos/{depot}/releases/assets/{actif['id']}", "DELETE", auth)
    donnees = exe.read_bytes()
    actif = requete(
        f"{ENVOI}/repos/{depot}/releases/{release['id']}/assets?name={exe.name}",
        "POST", auth, donnees, "application/octet-stream",
    )
    print(f"asset {actif['name']} envoyé : {actif['size']} octets, état {actif['state']}")
    print(f"téléchargement : {actif['browser_download_url']}")
    return release


def main() -> None:
    analyseur = argparse.ArgumentParser(description="Publie une version sur le dépôt de releases GitHub.")
    analyseur.add_argument("--version", required=True, help="Version, ex. 1.0.23-beta")
    analyseur.add_argument("--exe", help="Chemin de l'installeur à joindre")
    analyseur.add_argument("--depot", default=DEPOT_PAR_DEFAUT, help=f"Dépôt cible (défaut : {DEPOT_PAR_DEFAUT})")
    analyseur.add_argument("--titre", help="Nom affiché de la release")
    analyseur.add_argument("--corps", help="Corps de la release (sinon celui de version.json)")
    analyseur.add_argument("--corps-fichier", help="Fichier UTF-8 contenant le corps de la release")
    analyseur.add_argument("--corps-seulement", action="store_true",
                           help="Met à jour le corps sans renvoyer l'installeur")
    analyseur.add_argument("--brouillon", action="store_true", help="Crée la release en brouillon")
    analyseur.add_argument("--stable", action="store_true", help="Marque la release comme stable")
    arguments = analyseur.parse_args()
    arguments.prerelease = not arguments.stable
    arguments.draft = arguments.brouillon
    if not arguments.exe and not arguments.corps_seulement:
        analyseur.error("--exe est obligatoire sauf avec --corps-seulement")
    publier(arguments)


if __name__ == "__main__":
    sys.exit(main())