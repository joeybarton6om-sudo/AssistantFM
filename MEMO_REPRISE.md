# Assistant FM — Mémo de reprise (prochain travail)

## État actuel
- **Version publiée** : `1.0.43-beta` (tag `v1.0.43-beta` sur origin, release GitHub créée, `version.json` pushé sur releases)
- **Branche de travail** : `publier-v1.0.8` (AssistantFM) / `main` (releases)
- **Working directory** : `C:\Users\joeyb\Desktop\AssistantFM`
- **Repo releases** : `C:\Users\joeyb\Desktop\releases` (clone de `joeybarton6om-sudo/releases`)
- **Tous les commits sont pushés** (branche + tag + version.json)
- **Release GitHub** : `v1.0.43-beta` créée avec asset `AssistantFM-27-Setup.exe`, marquée Latest

## Fichiers clés
- `assistant_desktop.py` : `APP_VERSION` (ligne 12), `UPDATE_CHECK_URL` (ligne 15), `server_port()` = 8766 (ligne 385)
- `index.html` : version affichée (ligne `v<span id="app-version-display">...`), CSS du logo `.profile-logo-image`, `#workspace-title`
- `entrainement_collectif.js` : logique du programme d'entraînement collectif (`genererCycle`, `construireJour`, `estJourRecuperation`, `blocDuJour`, `scoreSeance`)
  - Logique actuelle (v1.0.34-beta) : lendemain de match = récupération (2 séances), veille du match = préparation (3 séances tactiques), J-2/J-3 = préparation, autres jours = développement/physique selon phase
- `parser.py` : extraction FM27 (`ReaderCheckError`, `historique_table`, `club_uid`)
- `server.py` : API locale, `/api/programme-fmf`, `_squelette()` (cherche `modeles/squelette.fmf` à côté de l'exe quand congelé)
- `assistant_installateur_nsis.nsi` : script NSIS, `!define VERSION` en dur, inclut `modeles\squelette.fmf` dans `$INSTDIR\modeles`
- `poster_discord.py` : annonce Discord, `VERSION`, `DOWNLOAD_URL`, `--version-url`
- `.github/workflows/release.yml` : dans le repo `releases`, s'active sur nouvelle release, checkout `AssistantFM` pour `poster_discord.py`
- `modeles/squelette.fmf` : vrai modèle FM27 (copié de l'installation qui fonctionne)
- `generer_modele_fmf.py` : **SUPPRIMÉ** (le template synthétique n'était pas compatible)

## Procédure de release complète (à chaque nouvelle version)
1. **Modifier les versions** :
   - `assistant_desktop.py` : `APP_VERSION`, `APP_VERSION_DATE`
   - `index.html` : `v<span id="app-version-display">X.X.X-beta</span>`
   - `assistant_installateur_nsis.nsi` : `!define VERSION "X.X.X-beta"`
   - `poster_discord.py` : `VERSION`, `DATE`, `DOWNLOAD_URL`
   - `C:\Users\joeyb\Desktop\releases/version.json` : version, date, url, changelog
2. **Reconstruire** :
   - `python -m PyInstaller assistant_desktop.spec --clean --noconfirm`
   - `python licences_desktop.py dist\Licences-tierces.txt`
   - `cmd /c copy "C:\Program Files (x86)\NSIS\COPYING" dist\Licences-NSIS.txt`
   - `& "C:\Program Files (x86)\NSIS\makensis.exe" /DBUILD_DIR=dist /DOUTPUT_FILE="dist/AssistantFM-27-Setup.exe" assistant_installateur_nsis.nsi`
3. **Git AssistantFM** :
   - `git add <fichiers modifiés>; git commit -m "..."; git push origin publier-v1.0.8`
   - `git tag vX.X.X-beta; git push origin vX.X.X-beta`
4. **GitHub release** (via `gh` CLI) :
   - `gh release create vX.X.X-beta dist/AssistantFM-27-Setup.exe --repo joeybarton6om-sudo/releases --title "..." --notes "..."`
   - Supprimer l'ancien asset si nécessaire : `gh release delete-asset vX.X.X-beta AssistantFM-27-Setup.exe --repo joeybarton6om-sudo/releases --yes`
5. **Git releases** :
   - `git add version.json; git commit -m "version.json à X.X.X-beta"; git push origin main`
6. **Token GitHub** : configuré via `$env:GH_TOKEN` (déjà défini dans l'environnement)
7. **Secret Discord** : `DISCORD_WEBHOOK_URL` déjà configuré dans le repo `releases` (Settings > Secrets and variables > Actions)

## Commandes utiles
- Vérifier PyInstaller : `python -m PyInstaller --version`
- Vérifier NSIS : `& "C:\Program Files (x86)\NSIS\makensis.exe"`
- Authentifier gh : `echo "TOKEN" | & "C:\Program Files\GitHub CLI\gh.exe" auth login --with-token`
- Vérifier version.json distant : `gh api repos/joeybarton6om-sudo/releases/contents/version.json --jq '.content | @base64d'`

## Problèmes connus / backlog
- Séparation des objectifs entraînement (équipe première = préparation/cohésion, réserves/jeunes = développement pur) — à ajouter dans `genererProgramme()` via un paramètre "niveau d'équipe"
- Test South Shields save : 0 joueurs/staff (limitation fmsave, pas de notre code)
- Import planning `.fmf` : fonctionne avec le vrai `modeles/squelette.fmf` inclus

## Corrections récentes (non pushées)
- **Watcher de sauvegardes** : `_demarrer_watcher()` réactivé dans `server.py` main() ; détection automatique du dossier FM27 `Documents/Sports Interactive/Football Manager 27/games` en fallback ; vérifié : `/api/watcher-status` renvoie `actif: true`
- **Historique carrière FM27** : `historique_carriere` et `saison_carriere` n'étaient renseignés que pour les joueurs du club géré (`est_mon`) dans `parser.py` ; suppression de la condition `est_mon and` pour rendre l'historique disponible à tous les joueurs
- **PermissionError extraction** : `parser.py` ligne ~1287 - gestion du verrouillage fichier Windows sur `players_data.json` : si `PermissionError` lors du `replace()`, suppression du fichier cible puis remplacement. Cause : `os.replace()` échoue sur Windows si le fichier est ouvert par un autre processus (serveur HTTP).

## Git remotes
- `origin` (AssistantFM) : `https://github.com/joeybarton6om-sudo/AssistantFM.git`
- `releases` : `https://github.com/joeybarton6om-sudo/releases.git`
