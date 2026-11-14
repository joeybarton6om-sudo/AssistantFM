with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 215-230: for loop at 4, if at 8, body at 12
for i in range(214, 235):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and (stripped.startswith('if ') or stripped.startswith('continue')):
        lines[i] = line[4:]  # 12 -> 8
    # Body of if (resultat.setdefault etc.) stays at 12

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed selections function')