with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines up to 746 (0-indexed: 746 is the '    )\n' line, which is line 747 1-indexed)
new_lines = lines[:747]  # Up to and including line 746 (0-indexed)

except_block = '''    except (fmsave.UnsupportedGameError, fmsave.ReaderCheckError) as error:
        print(f"Impossible d'ouvrir la sauvegarde : {error}", file=sys.stderr)
        return {
            "joueurs": [],
            "staff": [],
            "tactiques": [],
            "selections": [],
            "clubs": [],
            "nations": [],
            "version_jeu": {"game": "FM27", "build": "inconnu", "known_build": False},
            "club_gere": None,
            "erreur_tactiques": str(error),
            "erreur_selections": str(error),
            "erreur_statistiques_saison": str(error),
            "erreur_historique_carriere": str(error),
            "erreur_blessures": str(error),
            "erreur_finances": str(error),
            "cadre_financier": {},
        }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : py parser.py <chemin_de_la_sauvegarde.fm>")
        sys.exit(2)
    try:
        extraire_sauvegarde_totale(sys.argv[1])
    except (FileNotFoundError, RuntimeError, ValueError, OSError) as erreur:
        print(f"\n\u274c Erreur d'extraction : {erreur}")
        sys.exit(1)
'''

new_lines.append('\n')
new_lines.append(except_block)

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Fixed parser.py')
print(f'Total lines: {len(new_lines)}')