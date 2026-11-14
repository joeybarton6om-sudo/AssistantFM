with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
# Get the HTML around the support-banner element
idx = content.find('<aside id="support-banner" class="support-banner" aria-label="Soutenir Assistant FM">', 81900)
if idx >= 0:
    # Find the next major element after it
    next_details = content.find('<details', idx)
    next_aside = content.find('</aside>', idx)
    next_nav = content.find('<nav id="suivi-subnav"', idx)
    print(f'next_details: {next_details}')
    print(f'next_aside: {next_aside}')
    print(f'next_nav: {next_nav}')
    end = min([x for x in [next_details, next_aside, next_nav] if x > 0])
    print(repr(content[idx:end+20]))