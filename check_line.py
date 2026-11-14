with open('assistant_desktop.py', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('return {"logos"')
print(repr(content[idx:idx+100]))