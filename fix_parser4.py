with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove the orphaned except at lines 724-725 (0-indexed: 723-724)
# Keep lines up to 723, skip 724-725, then continue from 726
new_lines = lines[:723] + lines[726:]

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Removed orphaned except')
print(f'Total lines: {len(new_lines)}')