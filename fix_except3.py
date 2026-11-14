with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix with block in first except (lines 449-451): with at 12, body at 16
for i in range(448, 455):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and (stripped.startswith('json.dump') or stripped.startswith('fichier_temporaire.replace')):
        lines[i] = '    ' + line  # 12 -> 16
    elif leading == 8 and stripped.startswith('except OSError:'):
        lines[i] = '    ' + line  # 8 -> 12
    elif leading == 12 and stripped.startswith('pass') or leading == 12 and stripped.startswith('raise'):
        lines[i] = '    ' + line  # 12 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed first except block v3')