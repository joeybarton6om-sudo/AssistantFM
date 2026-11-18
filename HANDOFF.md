# Handoff — AssistantFM / FM27 training schedule (probe BepInEx)

## Objectif
Permettre à l’app desktop AssistantFM d’importer **en un clic** le planning d’entraînement collectif sur **toute la saison** dans Football Manager 27 (idéalement via les `.fmf` / écriture fiable), sans import manuel semaine par semaine dans l’UI.

État actuel : **non atteint**. Les écritures automatiques modifient l’arbre bindings/export mais ne sont **pas visibles en jeu** et la persistance après sauvegarde/rechargement n’est pas établie.

## Environnement & chemins
- **App / pipeline .fmf** : `C:\Users\joeyb\Desktop\AssistantFM\` (`server.py`, `app.js`, `entrainement_collectif.js`, `schedules_fmf.py`, `ecrire_fmf.py`, `_saison_payload.json` 29 semaines 609 slots 2027-10-04→2028-04-17, squelette `modeles\squelette.fmf`).
- **Plugin probe** : `C:\Users\joeyb\Desktop\AssistantFM-Plugin\ProbePlugin.cs`, `AssistantFM.Probe.csproj` (net6.0, LangVersion 10, AllowUnsafeBlocks). Build : `$env:DOTNET_ROOT="C:\Users\joeyb\AppData\Local\Temp\kilo\dotnet"; dotnet build ... -c Release -o out` → `out\AssistantFM.Probe.dll`.
- **Déployé** : `F:\SteamLibrary\steamapps\common\Football Manager 27\BepInEx\plugins\AssistantFM.Probe.dll` (Steam 4530370). FM exe `...\Football Manager 27\fm.exe`.
- **Runtime/triggers/rapports** : `F:\SteamLibrary\steamapps\common\Football Manager 27\BepInEx\assistantfm-*` (voir ci-dessous).
- **Schedules natifs** : `C:\Users\joeyb\Documents\Sports Interactive\Football Manager 27\schedules\` (70+ `*AssistantFM*.fmf` générés, saison complète couverte).
- **Inspector interop** : `C:\Users\joeyb\AppData\Local\Temp\kilo\inspect\bin\Release\net8.0\inspect.exe` sur `F:\...\BepInEx\interop\*.dll`.
- Repère temps observé : `day 0x14` = 2027-10-15 (base 2027-09-25). Ex. `day10`–`day16` = lun 11–dim 17 oct. 2027.

## Modèle FM27 (observé)
- Arbre bindings unique ~5462–5757 nœuds, 5 semaines / 98 sessions, fenêtre fixe **`day2`–`day24`** (35 jours) même après navigation mois sur l’écran mensuel.
- Slot `Event` : `TypedValue` = `DynamicReference (dynamic:1)` castable `SI.Core.Record` (33 entrées). Champs clés : `SessionType` (1330735726), `SessionName` (1781943364), `SessionCategory` (1111705668), `CanEdit` (3719858204), `EventType` (2839187823), `SessionIndex` (4205484058). Twin `Event/SessionType` et `calendarevent/SessionType`.
- Codes : 0-7,100-107,200-203,300 Repos,301 Récupération physique,302,303,400 Esprit d'équipe,402,500… `SessionCategory`=3 pour Repos et Récupération (dump) → couleur/catégorie pas maîtrisée.
- Écrans : `TrainingScreen` (vue semaine/carte, commit carte observé) vs `CalendarToolTrainingTab` (vue mois, navigation `MonthDropdown`, commit global observé). Noms non trouvés comme types interop (probables IDs UI). `EventFmxRemoveTrainingForcedScreen` apparaît.

## Ce qui fonctionne / ne fonctionne pas
- **Export** : `assistantfm-planning.json` / types / sonde / inspect fonctionnent (per-séance `AppliquerPlan` et bulk `AppliquerSaisonSlots` mettent à jour l’export). Dernier test : `day10`–`day16` = Récupération physique/Repos/Condition physique légère (19 slots, appliques=19 modeles=19 echecs=0, capture 17:18:49Z).
- **UI & persistance** : changements **non visibles en jeu** (vérifié) et persistance save/reload non établie.
  - `bindings.Set` seul = vue/bindings, non persistant.
  - `Record.InsertOrAssign` / `DynamicReferenceWithNotify.InsertOrAssignWithNotify` + mirror bindings + tentative `MarkNodeDirty` (réflexion) → export OK, UI/persistance KO.
- **Commits** : `eventData` **absent** des bindings (sonde : `selectData`/`customConfirmData` présents par slot ; `customConfirmData` non trouvé en pratique). `TenterCommitSequence` envoie Begin/Select/ConfirmSession/CommitWeek (card) + `EventFmxConfirmTrainingSchedule` (`Human.TrainingCalendar`/`human.TrainingCalendar`, `eventData`, ref nulle si absente) → filé, effet non observé. Pile captée = `UIEventQueue.QueueEvent(s)` (il2cpp→managed), handler natif de persistance non identifié.
- **`.fmf`** : saison complète générée dans `schedules`. `AppliquerSaison` (parse/decrypt+zstd in-process) → 70 fichiers ignorés `format` (pas de zstd en jeu). Import natif FM = semaine par semaine via UI, pas d’API d’import global identifiée.
- **Couverture** : écriture limitée aux jours exposés (`day2`–`day24`) ; slots hors vue ignorés.

## Triggers & sorties (BepInEx root)
- `assistantfm-declencher.txt` → export `planning.json`/`subsystemes.txt`
- `assistantfm-appliquer.txt` + `assistantfm-plan-cible.txt` (chemin\tcode\tnom) → `assistantfm-application.txt` (per-séance, `EcrireSlotModele` + commit)
- `assistantfm-appliquer-slots.txt` + `assistantfm-slots-plan.txt` (day\tslot\tcode\tnom) → `assistantfm-slots.txt`
- `assistantfm-confirmer-planning.txt` → `assistantfm-confirmation.txt`
- `assistantfm-sonder.txt` → `assistantfm-sonde.txt` ; `assistantfm-inspecter.txt` → `assistantfm-inspect.txt`
- `assistantfm-evenements.txt` (events + pile training), `assistantfm-instantane.txt`/snapshots, `assistantfm-appliquer-saison.txt`→`assistantfm-saison.txt`, `assistantfm-commit.txt`, `assistantfm-test-record.txt`, etc.

## Pistes / prochaines étapes
1. **Identifier le commit/persistance réel** : hooker le traitement des `EventToPluginContext` training (`EventFmxConfirmTrainingSchedule`, Save/Create/Begin/ConfirmCustomTrainingSchedule, `EventFmx*FromCard`) côté dispatch/récepteur `FM.UI`/`FM.GamePlugin`/`SI.Interop.EventFromPlugin` (ex. `OnEventFromPlugin`, `ProcessEventFromPlugin`, handlers) pour capter la pile native-managée ; corréler avec modification manuelle sur `CalendarToolTrainingTab` et `TrainingScreen`.
2. **Résoudre `eventData`/contexte** : `SI.Bindable` expose `GetParentEventData` / `ParentEventDataBinding` / `m_parentEventDataKey` — tenter de récupérer la valeur attendue plutôt que ref nulle.
3. **Vérifier écran/modèle autoritatif** : instrumenter `OpenPanel`/`OpenPrimaryTab`/`OpenSubtab` pour confirmer IDs ; comparer arbre/écriture sur `TrainingScreen` vs `CalendarToolTrainingTab` ; tester refresh UI (navigation mois, réouverture écran).
4. **Import saison 1 clic (une fois persistance OK)** : automate semaine par semaine (navigation/chargement semaine → attente jours exposés → écriture + commit natif → état `assistantfm-slots-etat.txt`, sauter semaines entamées) piloté par un trigger, alimenté par `_saison_payload.json`/`.fmf`. Alternative : invoquer `LoadTrainingSchedule`/chaîne save schedule si identifiable.
5. **Catégorie/couleur** : aligner `SessionCategory`/champs associés au type de séance.

## Déploiement plugin
Arrêter `fm` → copier `out\AssistantFM.Probe.dll` → `BepInEx\plugins\` → relancer `steam://rungameid/4530370` → charger save → ouvrir écran entraînement → poser triggers.
