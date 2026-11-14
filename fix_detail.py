with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''detail.innerHTML = `<p><strong>${escapeHtml(tactic.nom)}</strong>${tactic.mentalite ? ` · Mentalité ${escapeHtml(tactic.mentalite)}` : ""}</p><p>Les joueurs libres retenus dépassent le meilleur joueur au poste ou, s'ils ont moins de 20 ans, le PA du meilleur U20. Chaque joueur n'est proposé qu'une fois et chaque poste affiche trois profils maximum.</p>${warningHtml}<div class="pitch-mode-controls" role="group" aria-label="Vue des positions tactiques">${modeButtons}</div><div style="display:flex;gap:16px;flex-wrap:wrap;width:100%">${pitchesHtml}</div><h3>Rôles de la tactique</h3><div class="tactic-role-controls">${roleControls}</div><details style="margin-top:12px"><summary>Debug : données tactiques brutes</summary><pre style="background:#0c1925;padding:8px;max-height:300px;overflow:auto;font-size:10px">${escapeHtml(JSON.stringify(tactic.postes, null, 2))}</pre></details>`;'''

new = '''detail.innerHTML = `<p><strong>${escapeHtml(tactic.nom)}</strong>${tactic.mentalite ? ` · Mentalité ${escapeHtml(tactic.mentalite)}` : ""}</p><p>Les joueurs libres retenus dépassent le meilleur joueur au poste ou, s'ils ont moins de 20 ans, le PA du meilleur U20. Chaque joueur n'est proposé qu'une fois et chaque poste affiche trois profils maximum.</p>${warningHtml}<div class="pitch-mode-controls" role="group" aria-label="Vue des positions tactiques">${modeButtons}</div><div style="display:flex;gap:16px;flex-wrap:wrap;width:100%;background:rgba(255,255,255,0.02);border:1px dashed #5b9bd5;padding:8px;border-radius:8px">${pitchesHtml}</div><h3>Rôles de la tactique</h3><div class="tactic-role-controls">${roleControls}</div><details style="margin-top:12px"><summary>Debug : données tactiques brutes</summary><pre style="background:#0c1925;padding:8px;max-height:300px;overflow:auto;font-size:10px">${escapeHtml(JSON.stringify(tactic.postes, null, 2))}</pre></details>`;'''

if old in content:
    content = content.replace(old, new)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed app.js')
else:
    print('Pattern not found!')
    # Find similar
    idx = content.find('detail.innerHTML')
    if idx >= 0:
        print(repr(content[idx:idx+200]))