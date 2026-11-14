with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('<aside id="support-banner"')
if idx >= 0:
    print(repr(content[idx:idx+600]))