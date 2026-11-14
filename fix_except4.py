with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix try/except/with block in first except (lines 446-454)
for i in range(445, 460):
    if i >= len(lines):
        break
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 12 and stripped.startswith('except OSError:'):
        lines[i] = line[4:]  # 12 -> 8
    elif leading == 8 and stripped.startswith('pass'):
        lines[i] = '    ' + line  # 8 -> 12
    elif leading == 8 and stripped.startswith('raise'):
        lines[i] = '    ' + line  # 8 -> 12

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed first except block v4')