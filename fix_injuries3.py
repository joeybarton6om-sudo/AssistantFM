with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 282-290: for body at 8, if at 8, body at 12
for i in range(281, 295):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('if '):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 8 and (stripped.startswith('blessure') or stripped.startswith('if ')):
        lines[i] = '    ' + line  # 8 -> 12

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed injuries function v3')