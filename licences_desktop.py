#!/usr/bin/env python3
"""Génère un fichier de licences tiers pour l'installateur NSIS."""

import sys
from pathlib import Path
import importlib.metadata


def main(output_path: Path):
    notices = []

    # Python license
    python_license = Path(sys.base_prefix) / "LICENSE.txt"
    if not python_license.is_file():
        raise FileNotFoundError(f"Licence Python introuvable : {python_license}")
    notices.append("=== Python ===\n" + python_license.read_text(encoding="utf-8"))

    # Packages tiers (via importlib.metadata)
    try:
        dists = list(importlib.metadata.distributions())
    except Exception as e:
        print(f"Avertissement : impossible de lister les distributions installées : {e}", file=sys.stderr)
        dists = []

    for dist in dists:
        name = dist.metadata.get("Name", "").lower()
        if name in {"pip", "setuptools", "wheel", "pyinstaller", "altgraph", "pefile", "pywin32-ctypes", "pyinstaller-hooks-contrib", "packaging", "certifi", "charset-normalizer", "idna", "requests", "urllib3"}:
            # Skip common build-time dependencies
            continue
        license_files = [
            entry for entry in dist.files or []
            if entry and "license" in entry.name.lower()
               and (".dist-info/licenses/" in str(entry).replace("\\", "/")
                    or ".dist-info/LICENSE" in str(entry).replace("\\", "/"))
        ]
        if license_files:
            for entry in license_files:
                try:
                    content = dist.read_text(entry.name)
                    notices.append(f"=== {dist.metadata['Name']} ===\n{content}")
                except Exception:
                    pass

    output_path.write_text("\n\n".join(notices), encoding="utf-8")
    print(f"Licences écrites dans {output_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage : python licences_desktop.py <fichier-sortie>")
    main(Path(sys.argv[1]))