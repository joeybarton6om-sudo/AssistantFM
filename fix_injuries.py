with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 275-290: for at 4, body at 8, if at 8, continue at 12, body at 12
for i in range(274, 295):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('uid =') or leading == 12 and stripped.startswith('if ') or leading == 12 and stripped.startswith('blessure') or leading == 12 and stripped.startswith('"nom"') or leading == 12 and stripped.startswith('"type"') or leading == 12 and stripped.startswith('"debut"') or leading == 12 and stripped.startswith('"fin"') or leading == 12 and stripped.startswith('"duree"') or leading == 12 and stripped.startswith('}') or leading == 12 and stripped.startswith('resultat'):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 12 and stripped.startswith('continue'):
        lines[i] = '    ' + line  # 12 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed injuries function')