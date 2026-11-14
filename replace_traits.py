with open('parser.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 87-125 (1-indexed) = 86-124 (0-indexed)
new_function = '''def extraire_traits(traits_list, traits_codes=None):
    """Extrait la liste des traits d'un joueur.

    Accepte soit:
    - liste de CodedValue (objets fmsave) -> utilise .label_text et .raw
    - liste de labels (str) + liste de codes (int) -> combine les deux
    """
    if not traits_list:
        return []

    # Cas 1: liste de CodedValue (objets fmsave non convertis)
    if traits_list and hasattr(traits_list[0], "label_text"):
        resultats = []
        for t in traits_list:
            nom_trait = t.label_text if hasattr(t, "label_text") else str(t.label)
            description = nom_trait.replace("_", " ").capitalize()
            raw_val = t.raw if hasattr(t, "raw") else None
            resultats.append({"nom": nom_trait, "description": description, "raw": raw_val})
        return resultats

    # Cas 2: liste de labels (str) + liste de codes (int) - format JSON-ready
    if isinstance(traits_list, list) and all(isinstance(t, str) for t in traits_list):
        if traits_codes and isinstance(traits_codes, list) and len(traits_codes) == len(traits_list):
            return [
                {"nom": label, "description": label.replace("_", " ").capitalize(), "raw": code}
                for label, code in zip(traits_list, traits_codes)
            ]
        return [
            {"nom": label, "description": label.replace("_", " ").capitalize(), "raw": None}
            for label in traits_list
        ]

    # Cas 3: chaîne unique (fallback)
    if isinstance(traits_list, str):
        return [{"nom": traits_list, "description": traits_list.replace("_", " ").capitalize(), "raw": None}]

    return []

'''

# Replace lines 87-125 (1-indexed) = 86-124 (0-indexed)
new_lines = lines[:86] + [new_function] + lines[124:]

with open('parser.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Replaced extraire_traits function')