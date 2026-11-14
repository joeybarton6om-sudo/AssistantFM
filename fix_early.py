with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix DateTimeEncoder class (lines 19-24)
lines[21] = '        if isinstance(obj, (date, datetime)):\n'
lines[22] = '            return obj.isoformat()\n'
lines[23] = '        return super().default(obj)\n'

# Fix signaler_etape function (lines 27-36)
lines[29] = '        destination = Path(chemin)\n'
lines[30] = '        temporaire = destination.with_suffix(".tmp")\n'
lines[31] = '        try:\n'
lines[32] = '            temporaire.write_text(json.dumps({"etape": message}, ensure_ascii=False), encoding="utf-8")\n'
lines[33] = '            temporaire.replace(destination)\n'
lines[34] = '        finally:\n'
lines[35] = '            if temporaire.exists():\n'
lines[36] = '                temporaire.unlink()\n'

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed early functions')