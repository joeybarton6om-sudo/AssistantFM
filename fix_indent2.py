with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix: try/except blocks inside with sauvegarde: need proper indentation
# try: should have 8 spaces, body should have 12 spaces
# except: should have 8 spaces, body should have 12 spaces

new_lines = []
for i, line in enumerate(lines):
    stripped = line.lstrip()
    leading = len(line) - len(stripped)
    
    if leading == 8 and stripped.startswith('try:'):
        # try: at 8 spaces - body should be at 12 spaces
        new_lines.append(line)  # keep try: at 8 spaces
    elif leading == 8 and (stripped.startswith('except ') or stripped.startswith('finally:')):
        # except/finally at 8 spaces - body should be at 12 spaces
        new_lines.append(line)
    elif leading == 8 and stripped and not stripped.startswith('#'):
        # Code at 8 spaces that should be at 12 (inside try/except body)
        new_lines.append('    ' + line)
    else:
        new_lines.append(line)

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Fixed try/except indentation')