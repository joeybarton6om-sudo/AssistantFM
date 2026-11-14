with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 353-354: should be at 16 (for body)
for i in range(352, 360):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and (stripped.startswith('team_id') or stripped.startswith('# Ne garder')):
        lines[i] = '    ' + line  # 12 -> 16

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed national selections function v6')