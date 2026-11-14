with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('<aside id="support-banner"')
if idx >= 0:
    # Find the closing </aside> or the next <nav
    next_nav = content.find('<nav id="recruitment-subnav"', idx)
    next_aside_end = content.find('</aside>', idx)
    print(f'next_nav: {next_nav}')
    print(f'next_aside_end: {next_aside_end}')
    if next_nav > 0:
        print(repr(content[idx:next_nav+50]))
    elif next_aside_end > 0:
        print(repr(content[idx:next_aside_end+10]))