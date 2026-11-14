with open('assistant_desktop.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 222 (0-indexed: 221)
lines[221] = '        return {"logos": "", "visages": "", "sauvegardes": "", "tactiques": ""}\n'

with open('assistant_desktop.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed line 222')