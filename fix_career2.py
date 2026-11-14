with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 244-255: for at 4, body at 8, if at 8, continue at 12, body at 12
for i in range(243, 260):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('uid =') or leading == 12 and stripped.startswith('resultat'):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 12 and stripped.startswith('if '):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 16 and stripped.startswith('continue'):
        lines[i] = line[4:]  # 16 -> 12

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed career history function v2')