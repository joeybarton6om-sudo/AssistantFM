with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 355-356: if at 16, continue at 20
for i in range(354, 360):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 16 and stripped.startswith('if '):
        pass  # if at 16 is correct (inside for body)
    elif leading == 16 and stripped.startswith('continue'):
        lines[i] = '    ' + line  # 16 -> 20
    elif leading == 12 and stripped.startswith('par_joueur'):
        lines[i] = '    ' + line  # 12 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed national selections function v5')