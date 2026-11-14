with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 383-395: for at 12, body at 16
for i in range(382, 400):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and (stripped.startswith('club_uid') or stripped.startswith('if ') or stripped.startswith('transferts') or stripped.startswith('}')):
        lines[i] = '    ' + line  # 12 -> 16
    elif leading == 16 and stripped.startswith('continue'):
        pass  # correct at 16 (inside if at 16)

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed transfers function')