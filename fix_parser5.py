with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Indent lines 724-744 (0-indexed: 723-743) from 4 spaces to 8 spaces
# These lines are currently at 4 spaces (inside try, outside with)
# They should be at 8 spaces (inside try, outside with)
new_lines = []
for i, line in enumerate(lines):
    if 723 <= i <= 743:  # lines 724-744 (1-indexed)
        # Add 4 spaces to the beginning
        if line.startswith('    '):
            new_lines.append('    ' + line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Indented lines 724-744')
print(f'Total lines: {len(new_lines)}')