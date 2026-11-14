with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 348-360: outer block at 8, for at 12, body at 16
for i in range(347, 365):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 16 and stripped.startswith('for '):
        lines[i] = line[4:]  # 16 -> 12
    elif leading == 16 and (stripped.startswith('uid =') or stripped.startswith('if ') or stripped.startswith('par_joueur') or stripped.startswith('nom') or stripped.startswith('club') or stripped.startswith('remplacant') or stripped.startswith('}')):
        lines[i] = line[4:]  # 16 -> 12
    elif leading == 20 and stripped.startswith('continue'):
        lines[i] = line[4:]  # 20 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed national selections function v2')