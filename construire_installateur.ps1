param(
    [Parameter(Mandatory = $true)][string]$Python,
    [Parameter(Mandatory = $true)][string]$InnoSetup
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$build = Join-Path $root 'construction-desktop'
$dist = Join-Path $build 'dist'
$output = Join-Path $root 'distribution'
New-Item -ItemType Directory -Force -Path $dist, $output | Out-Null
& $Python -m PyInstaller --noconfirm --distpath $dist --workpath (Join-Path $build 'temp') (Join-Path $root 'assistant_desktop.spec')
if ($LASTEXITCODE -ne 0) { throw "Échec de la construction de l'exécutable." }
& $Python (Join-Path $root 'licences_desktop.py') (Join-Path $dist 'Licences-tierces.txt')
if ($LASTEXITCODE -ne 0) { throw "Échec de la collecte des licences." }
& $InnoSetup "/DBuildDirectory=$dist" "/DOutputDirectory=$output" (Join-Path $root 'assistant_installateur.iss')
if ($LASTEXITCODE -ne 0) { throw "Échec de la création de l'installateur." }
Write-Host "Installateur créé : $(Join-Path $output 'AssistantFM-Installation.exe')"
