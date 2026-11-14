with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the first except block (lines 426-454): except at 4, body at 8, nested at 12, double-nested at 16
for i in range(425, 455):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and (stripped.startswith('error_data') or stripped.startswith('"joueurs"') or stripped.startswith('"staff"') or stripped.startswith('"tactiques"') or stripped.startswith('"selections"') or stripped.startswith('"clubs"') or stripped.startswith('"nations"') or stripped.startswith('"version_jeu"') or stripped.startswith('"club_gere"') or stripped.startswith('"erreur_') or stripped.startswith('"cadre_financier"') or stripped.startswith('}') or stripped.startswith('try:') or stripped.startswith('except OSError:') or stripped.startswith('pass') or stripped.startswith('raise')):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 16 and (stripped.startswith('json.dump') or stripped.startswith('fichier_temporaire.replace')):
        lines[i] = line[4:]  # 16 -> 12
    elif leading == 8 and stripped.startswith('try:') or leading == 8 and stripped.startswith('except OSError:'):
        pass  # correct at 8

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed first except block')