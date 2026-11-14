from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

root = Path(SPECPATH)
assets = ["index.html", "app.js", "donnees_locales.js", "ponderations.js", "plan_sportif.js",
          "performances.js", "analyse_recrutement.js", "alertes.js", "suivi.js", "comparateur.js",
          "directeur_sportif.js", "recrutement_poste.js", "optimisation_tactique.js", "outils_persistants.js",
          "desktop_bridge.js", "tcmlogos-logo.png"]

a = Analysis(
    [str(root / "assistant_desktop.py")],
    pathex=[str(root)],
    binaries=[],
    datas=[(str(root / asset), ".") for asset in assets],
    hiddenimports=collect_submodules("fmsave") + ["webview.platforms.edgechromium"],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, a.binaries, a.datas,
    name="AssistantFM",
    console=False,
    icon=str(root / "assistantfm.ico"),
    upx=False,
)
worker = EXE(
    pyz, a.scripts, a.binaries, a.datas,
    name="AssistantFM-extracteur",
    console=True,
    upx=False,
)
