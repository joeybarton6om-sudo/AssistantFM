with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''        <aside id="support-banner" class="support-banner" aria-label="Soutenir Assistant FM">
            <details open><summary>Rechercher</summary>
            <button type="button" class="tab-btn active" data-recruitment-view="joueurs" onclick="changerOnglet('joueurs')" aria-current="page">🏃 Joueurs</button>
            <button type="button" class="tab-btn" data-recruitment-view="staff" onclick="changerOnglet('staff')">👔 Staff technique</button>
            <button type="button" class="tab-btn" data-recruitment-view="similaires" onclick="changerOnglet('similaires')">🔎 Similaires</button>
            <button type="button" class="tab-btn" data-recruitment-view="recrutement-poste" onclick="changerOnglet('recrutement-poste')">Recruter par poste</button>
            </details><details><summary>Planifier</summary>
            <button type="button" class="tab-btn" data-recruitment-view="planificateur" onclick="changerOnglet('planificateur')">Planificateur d'effectif</button>
            <button type="button" class="tab-btn" data-recruitment-view="mercato" onclick="changerOnglet('mercato')">Copilote mercato</button>
            <button type="button" class="tab-btn" data-recruitment-view="affaires" onclick="changerOnglet('affaires')">Bonnes affaires</button>
            </details>
        </nav>
        <nav id="recruitment-subnav" class="filter-bar" aria-label="Vues du recrutement" style="display:flex">'''

new = '''        <aside id="support-banner" class="support-banner" aria-label="Soutenir Assistant FM">
            <p>Version gratuite : recrutement joueurs et staff. Un don débloque toutes les autres fonctions pendant un an.</p>
            <button type="button" id="open-license-gate">Soutenir l'application</button>
        </aside>
        <nav id="recruitment-subnav" class="filter-bar" aria-label="Vues du recrutement" style="display:flex">'''

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\joeyb\Desktop\AssistantFM\index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Remplacement effectue')
else:
    print('Ancien texte non trouve')