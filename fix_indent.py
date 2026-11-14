with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix indentation for lines inside `with sauvegarde:` block
# The block starts around line 456 and ends before the file writing section
# We need to remove 4 spaces from lines that have 12 spaces (3 levels) and should have 8 spaces (2 levels)

new_lines = []
in_with_block = False
for i, line in enumerate(lines):
    # Detect start of with block
    if 'with sauvegarde:' in line:
        in_with_block = True
        new_lines.append(line)
        continue
    
    # Detect end of with block - look for the line that's not indented (or less indented)
    # The with block ends before "    fichier_sortie = " (line with 4 spaces)
    if in_with_block and line.startswith('    fichier_sortie = '):
        in_with_block = False
    
    if in_with_block:
        # Remove 4 spaces from lines that have 12+ spaces
        if line.startswith('            '):  # 12 spaces
            new_lines.append(line[4:])  # Remove 4 spaces
        elif line.startswith('        '):  # 8 spaces - this is correct for with block body
            new_lines.append(line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Fixed indentation')