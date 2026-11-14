with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace line 3706 (0-indexed: 3705)
old_line = lines[3705]
new_line = old_line.replace(
    'display:flex;gap:16px;flex-wrap:wrap;width:100%">${pitchesHtml}</div>',
    'display:flex;gap:16px;flex-wrap:wrap;width:100%;background:rgba(255,255,255,0.02);border:1px dashed #5b9bd5;padding:8px;border-radius:8px">${pitchesHtml}</div>'
)
lines[3705] = new_line

with open('app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed line 3706')
print('Old:', old_line[:80])
print('New:', new_line[:80])