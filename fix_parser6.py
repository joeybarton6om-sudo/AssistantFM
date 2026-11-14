with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix the broken f-string at lines 774-775
new_lines = []
for i, line in enumerate(lines):
    if i == 773:  # line 774 (0-indexed)
        new_lines.append('        print(f"\\n\u274c Erreur d\'extraction : {erreur}")\n')
    elif i == 774:  # line 775 - skip this line as it's part of the broken f-string
        continue
    else:
        new_lines.append(line)

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Fixed f-string')
print(f'Total lines: {len(new_lines)}')