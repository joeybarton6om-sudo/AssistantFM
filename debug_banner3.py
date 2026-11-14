with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('<aside id="support-banner"')
if idx >= 0:
    end_idx = content.find('<nav id="recruitment-subnav"', idx)
    if end_idx >= 0:
        print(repr(content[idx:end_idx+50]))