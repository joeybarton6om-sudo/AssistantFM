with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix if block at lines 632-633: if at 12, body at 16
for i in range(631, 640):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and (stripped.startswith('clubs_references') or stripped.startswith('clubs_exportes') or stripped.startswith('for ') or stripped.startswith('if ') or stripped.startswith('continue') or stripped.startswith('club_exporte') or stripped.startswith('club_exporte') or stripped.startswith('clubs_exportes.append') or stripped.startswith('club_gere') or stripped.startswith('identifiants_graphiques_nations') or stripped.startswith('classements_clubs') or stripped.startswith('clubs_references') or stripped.startswith('if club_uid') or stripped.startswith('finances') or stripped.startswith('derniere_finance') or stripped.startswith('joueurs_geres_uids') or stripped.startswith('blessures_par_uid') or stripped.startswith('cles_staff') or stripped.startswith('uids_staff') or stripped.startswith('donnees_finales') or stripped.startswith('"joueurs"') or stripped.startswith('"staff"') or stripped.startswith('"clubs"') or stripped.startswith('"club_gere"') or stripped.startswith('"date_sauvegarde"') or stripped.startswith('"version_jeu"') or stripped.startswith('"statistiques"') or stripped.startswith('"erreur"') or stripped.startswith('"historique"') or stripped.startswith('"cadre_financier"') or stripped.startswith('"mois"') or stripped.startswith('"budget"') or stripped.startswith('"masse"') or stripped.startswith('"solde"') or stripped.startswith('}')):
        lines[i] = '    ' + line  # 12 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed main function body')