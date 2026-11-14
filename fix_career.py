with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 245-255: if at 12, continue at 16, body at 16
for i in range(244, 260):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('if '):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 12 and stripped.startswith('continue'):
        lines[i] = '    ' + line  # 12 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed career history function')