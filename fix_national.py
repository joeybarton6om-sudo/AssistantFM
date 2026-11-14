with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 349-360: for at 12, body at 16
for i in range(348, 365):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('for '):
        lines[i] = '    ' + line  # 12 -> 16
    elif leading == 12 and (stripped.startswith('uid =') or stripped.startswith('if ') or stripped.startswith('par_joueur') or stripped.startswith('nom') or stripped.startswith('club') or stripped.startswith('remplacant') or stripped.startswith('}')):
        lines[i] = '    ' + line  # 12 -> 16
    elif leading == 16 and stripped.startswith('continue'):
        lines[i] = '    ' + line  # 16 -> 20

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed national selections function')