"""Poste la notification de la release v1.0.24-beta sur le Discord communautaire.

Prérequis :
  1. Avoir créé un webhook Discord dans le salon « update » de votre serveur
  2. Avoir la variable d'environnement DISCORD_WEBHOOK_URL définie
     ou la passer en argument : python poster_discord.py <URL>

Exemple :
  python poster_discord.py
  $env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."; python poster_discord.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent

VERSION = "1.0.38-beta"
DATE = "2026-11-20"
DOWNLOAD_URL = "https://github.com/joeybarton6om-sudo/releases/releases/download/v1.0.38-beta/AssistantFM-27-Setup.exe"
VERSION_JSON_URL = "https://raw.githubusercontent.com/joeybarton6om-sudo/releases/main/version.json"


def charger_changelog(version_url: str | None = None) -> str:
    if version_url:
        try:
            with urllib.request.urlopen(version_url, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))
            return data.get("changelog", "")
        except (OSError, json.JSONDecodeError, urllib.error.URLError):
            pass
    version_path = ROOT / "version.json"
    if version_path.is_file():
        try:
            data = json.loads(version_path.read_text(encoding="utf-8"))
            return data.get("changelog", "")
        except (OSError, json.JSONDecodeError):
            pass
    return ""


def construire_embed(changelog: str) -> dict:
    lignes = [ligne.strip() for ligne in changelog.splitlines() if ligne.strip()]
    description = "\n".join(lignes) if lignes else "Consultez le dépôt GitHub pour le détail des modifications."

    return {
        "embeds": [
            {
                "title": "🚀 Assistant FM - Nouvelle mise à jour",
                "description": (
                    f"**Version** : {VERSION}\n"
                    f"**Date** : {DATE}\n"
                    f"**Téléchargement** : {DOWNLOAD_URL}\n\n"
                    f"{description}"
                ),
                "color": 0x2b65ed,
                "footer": {"text": "Assistant FM Updates"},
                "timestamp": "2026-11-18T17:00:00Z",
            }
        ]
    }


def poster(webhook_url: str, payload: dict) -> bool:
    donnees = json.dumps(payload).encode("utf-8")
    requete = urllib.request.Request(
        webhook_url,
        data=donnees,
        method="POST",
    )
    requete.add_header("Content-Type", "application/json")
    requete.add_header("User-Agent", "AssistantFM/1.0 (https://github.com/joeybarton6om-sudo/AssistantFM)")
    try:
        with urllib.request.urlopen(requete, timeout=30) as reponse:
            corps = reponse.read()
            print(f"Réponse Discord : {reponse.status} {corps.decode('utf-8', errors='replace')}")
            return reponse.status in (200, 201, 204)
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code} : {error.read().decode('utf-8', errors='replace')}", file=sys.stderr)
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Poster la release Assistant FM sur Discord.")
    parser.add_argument("webhook", nargs="?", help="URL du webhook Discord")
    parser.add_argument("--version-url", default=VERSION_JSON_URL, help="URL du fichier version.json")
    args = parser.parse_args()

    webhook_url = args.webhook or os.environ.get("DISCORD_WEBHOOK_URL", "")
    if not webhook_url:
        print("Aucune URL de webhook fournie.", file=sys.stderr)
        print("Définissez DISCORD_WEBHOOK_URL ou passez l'URL en argument.", file=sys.stderr)
        return 1

    changelog = charger_changelog(args.version_url)
    payload = construire_embed(changelog)
    print(f"Publication de la release {VERSION} sur Discord...")
    if poster(webhook_url, payload):
        print("Message posté avec succès.")
        return 0
    print("Échec de la publication Discord.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())