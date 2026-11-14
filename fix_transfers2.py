with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 386: continue at 20 (inside if at 16)
for i in range(385, 390):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 16 and stripped.startswith('continue'):
        lines[i] = '    ' + line  # 16 -> 20

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed transfers function v2')