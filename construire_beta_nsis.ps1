param(
    [Parameter(Mandatory = $true)][string]$Python,
    [Parameter(Mandatory = $true)][string]$NsisDirectory
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dist = Join-Path $root 'construction-desktop\dist'
$work = Join-Path $root 'construction-desktop\temp'
$output = Join-Path $root 'distribution\AssistantFM-Beta-2026-11-11-comparateur-joueur.exe'
$compiler = Join-Path $NsisDirectory 'makensis.exe'
$license = Join-Path $NsisDirectory 'COPYING'
if (-not (Test-Path -LiteralPath $compiler -PathType Leaf)) { throw "Compilateur NSIS introuvable : $compiler" }
if (-not (Test-Path -LiteralPath $license -PathType Leaf)) { throw "Licence NSIS introuvable : $license" }
if (-not (Test-Path -LiteralPath (Join-Path $root 'activation_public.pem') -PathType Leaf)) {
    throw "La clé publique d'activation est absente : l'installateur ne permettrait pas d'activer les licences."
}
New-Item -ItemType Directory -Force -Path $dist, (Split-Path $output) | Out-Null
& $Python -m PyInstaller --noconfirm --distpath $dist --workpath $work (Join-Path $root 'assistant_desktop.spec')
if ($LASTEXITCODE -ne 0) { throw "Échec de la construction des exécutables." }
& $Python (Join-Path $root 'licences_desktop.py') (Join-Path $dist 'Licences-tierces.txt')
if ($LASTEXITCODE -ne 0) { throw "Échec de la collecte des licences." }
Copy-Item -LiteralPath $license -Destination (Join-Path $dist 'Licences-NSIS.txt')
& $compiler /WX /INPUTCHARSET UTF8 "/DBUILD_DIR=$dist" "/DOUTPUT_FILE=$output" (Join-Path $root 'assistant_installateur_nsis.nsi')
if ($LASTEXITCODE -ne 0) { throw "Échec de la création de l'installateur." }
Write-Host "Installateur créé : $output"
