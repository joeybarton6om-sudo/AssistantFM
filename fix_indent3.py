with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix indentation only for the `with sauvegarde:` block
# Find the start and end of the block
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'with sauvegarde:' in line:
        start_idx = i
    if start_idx is not None and end_idx is None and line.startswith('    fichier_sortie = '):
        end_idx = i
        break

print(f"Block: lines {start_idx+1} to {end_idx}")

# Fix indentation in this range only
for i in range(start_idx + 1, end_idx):
    line = lines[i]
    leading = len(line) - len(line.lstrip())
    stripped = line.lstrip()
    
    if leading == 8:
        if stripped.startswith('try:') or stripped.startswith('except ') or stripped.startswith('finally:') or stripped.startswith('with ') or stripped.startswith('if ') or stripped.startswith('for ') or stripped.startswith('while ') or stripped.startswith('def ') or stripped.startswith('class ') or stripped.startswith('elif ') or stripped.startswith('else:'):
            # Control structures at 8 spaces - keep as is
            pass
        elif stripped and not stripped.startswith('#'):
            # Regular code at 8 spaces should be at 12 (inside try/except)
            lines[i] = '    ' + line

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed with sauvegarde block indentation')