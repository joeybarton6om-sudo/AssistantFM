with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('<aside id="support-banner" class="support-banner" aria-label="Soutenir Assistant FM">', 81900)
if idx >= 0:
    next_nav = content.find('<nav id="suivi-subnav"', idx)
    if next_nav > 0:
        # Find the last </details> before the nav
        search_area = content[idx:next_nav]
        last_details_end = search_area.rfind('</details>')
        if last_details_end >= 0:
            actual_end = idx + last_details_end + 10
            print(repr(content[idx:actual_end]))
            print('---')
            print(f'Length: {actual_end - idx}')