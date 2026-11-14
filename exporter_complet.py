import argparse
import io
import json
import warnings
import zipfile
from pathlib import Path

import fmsave
from fmsave import export as fmsave_export


TABLES = (
    "players",
    "contracts",
    "suspensions",
    "clubs",
    "managed_clubs",
    "stages",
    "competitions",
    "nations",
    "fixtures",
    "league_tables",
    "transfer_windows",
    "competition_rules",
    "player_match_stats",
    "player_season_stats",
    "player_season_history",
    "stadiums",
    "finances",
    "sponsorships",
    "facilities",
    "affiliates",
    "job_vacancies",
    "staff",
    "staff_lists",
    "injury_types",
    "injuries",
    "training",
    "mentoring",
    "tactics",
    "set_pieces",
    "selections",
)


def export_table(save, archive, table_name):
    with warnings.catch_warnings(record=True) as caught_warnings:
        warnings.simplefilter("always")
        table = getattr(save, table_name)()

    entry_name = f"tables/{table_name}.json"
    with archive.open(entry_name, "w") as binary_file:
        with io.TextIOWrapper(binary_file, encoding="utf-8") as text_file:
            text_file.write("[\n")
            for index, record in enumerate(table):
                if index:
                    text_file.write(",\n")
                json.dump(
                    fmsave_export.record_to_dict(record, json_ready=True),
                    text_file,
                    ensure_ascii=False,
                )
            text_file.write("\n]\n")

    return {
        "status": "ok",
        "record_count": len(table),
        "warnings": [str(item.message) for item in caught_warnings],
    }


def create_export(save_path, output_path):
    manifest = {
        "format": "Assistant FM complete export",
        "fmsave_version": fmsave.__version__,
        "game": None,
        "build": None,
        "known_build": None,
        "tables": {},
        "limits": [
            "L'export contient toutes les tables exposees par la version installee de fmsave.",
            "Les champs binaires que fmsave ne sait pas decoder ne peuvent pas etre restitues.",
            "Les attributs professionnels du staff ne sont pas tous exposes par fmsave; "
            "ne pas les deduire a partir de champs inconnus.",
            "La prise en charge FM27 peut etre partielle selon le build de la sauvegarde.",
        ],
    }

    with fmsave.open(save_path) as save:
        manifest["game"] = save.info.game
        manifest["build"] = save.info.build
        manifest["known_build"] = save.info.known_build
        with zipfile.ZipFile(
            output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6
        ) as archive:
            for table_name in TABLES:
                try:
                    result = export_table(save, archive, table_name)
                except fmsave.FmsaveError as error:
                    result = {"status": "failed", "error": str(error)}
                manifest["tables"][table_name] = result
                print(f"{table_name}: {result['status']}")

            with archive.open("manifest.json", "w") as binary_file:
                with io.TextIOWrapper(binary_file, encoding="utf-8") as text_file:
                    json.dump(manifest, text_file, ensure_ascii=False, indent=2)
                    text_file.write("\n")

    return manifest


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Exporte en JSON les tables que fmsave sait lire dans une sauvegarde FM. "
            "La sauvegarde source n'est jamais modifiee."
        )
    )
    parser.add_argument("sauvegarde", type=Path, help="fichier de sauvegarde .fm ou .fmf")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="archive ZIP a creer (par defaut: <nom sauvegarde>_export_complet.zip)",
    )
    args = parser.parse_args()

    save_path = args.sauvegarde.expanduser().resolve()
    if not save_path.is_file():
        parser.error(f"sauvegarde introuvable : {save_path}")

    output_path = (
        args.output.expanduser().resolve()
        if args.output
        else save_path.with_name(f"{save_path.stem}_export_complet.zip")
    )
    if output_path == save_path:
        parser.error("le chemin de sortie ne peut pas remplacer la sauvegarde source")
    if output_path.exists():
        parser.error(f"le fichier de sortie existe deja : {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        manifest = create_export(save_path, output_path)
    except (OSError, fmsave.FmsaveError) as error:
        parser.exit(1, f"Erreur d'extraction : {error}\n")

    failed_tables = [
        name for name, result in manifest["tables"].items() if result["status"] != "ok"
    ]
    warning_count = sum(
        len(result.get("warnings", [])) for result in manifest["tables"].values()
    )
    print(f"Archive creee : {output_path}")
    print(
        f"Tables exportees : {len(TABLES) - len(failed_tables)}/{len(TABLES)}"
        f" | avertissements : {warning_count}"
    )
    if failed_tables:
        print(f"Tables en echec (details dans manifest.json) : {', '.join(failed_tables)}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
