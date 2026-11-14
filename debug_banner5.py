with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
# Find all occurrences of support-banner and recruitment-subnav
import re
for m in re.finditer(r'(support-banner|recruitment-subnav|suivi-subnav)', content):
    start = max(0, m.start()-50)
    end = min(len(content), m.end()+50)
    print(f'Found {m.group()} at {m.start()}: {repr(content[start:end])}')
    print('---')