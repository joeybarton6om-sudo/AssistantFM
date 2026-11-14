with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 293-310: outer for at 4, inner for at 8, inner body at 12, if at 12, continue at 16
for i in range(292, 315):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('for '):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 8 and (stripped.startswith('uid =') or stripped.startswith('if ') or stripped.startswith('classements')):
        lines[i] = '    ' + line  # 8 -> 12
    elif leading == 12 and stripped.startswith('continue'):
        lines[i] = '    ' + line  # 12 -> 16
    elif leading == 12 and stripped.startswith('}'):
        lines[i] = line[4:]  # 12 -> 8

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed standings function')