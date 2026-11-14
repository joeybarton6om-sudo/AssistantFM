Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

!ifndef BUILD_DIR
  !error "BUILD_DIR doit designer le dossier des executables."
!endif
!ifndef OUTPUT_FILE
  !error "OUTPUT_FILE doit designer le fichier d'installation."
!endif

; --- Version / Date ---
!define VERSION "1.0.7-beta"
!define VERSION_DATE "2026-11-12"
!define APP_NAME "Assistant FM"

Name "${APP_NAME}"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\${APP_NAME}"
InstallDirRegKey HKCU "Software\AssistantFM" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID zlib
Icon "assistantfm.ico"
UninstallIcon "assistantfm.ico"
ShowInstDetails show
ShowUninstDetails show

; --- MUI customisation ---
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\AssistantFM.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Lancer Assistant FM"
!define MUI_WELCOMEPAGE_TITLE "${APP_NAME} - ${VERSION} (${VERSION_DATE})"
!define MUI_WELCOMEPAGE_TEXT "Cet assistant installe ${APP_NAME} ${VERSION} sur votre ordinateur.\r\n\r\nL'application nécessite :\r\n- Windows 10/11 (64-bit)\r\n- WebView2 Runtime (installé automatiquement si absent)\r\n- Football Manager 2027 installé"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom DossiersPage DossiersValider
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "French"

Var Logos
Var Visages
Var Sauvegardes
Var LogosInput
Var VisagesInput
Var SauvegardesInput

Function .onInit
  StrCpy $Logos ""
  StrCpy $Visages ""
  StrCpy $Sauvegardes ""
  ${If} ${FileExists} "$DOCUMENTS\Sports Interactive\Football Manager 27\graphics\*.*"
    StrCpy $Logos "$DOCUMENTS\Sports Interactive\Football Manager 27\graphics"
    StrCpy $Visages $Logos
    ${If} ${FileExists} "$Logos\faces\*.*"
      StrCpy $Visages "$Logos\faces"
    ${EndIf}
  ${EndIf}
  ${If} ${FileExists} "$DOCUMENTS\Sports Interactive\Football Manager 27\games\*.*"
    StrCpy $Sauvegardes "$DOCUMENTS\Sports Interactive\Football Manager 27\games"
  ${EndIf}
FunctionEnd

Function ParcourirLogos
  nsDialogs::SelectFolderDialog "Choisissez le dossier des logos" "$Logos"
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $LogosInput $0
  ${EndIf}
FunctionEnd

Function ParcourirVisages
  nsDialogs::SelectFolderDialog "Choisissez le dossier des visages" "$Visages"
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $VisagesInput $0
  ${EndIf}
FunctionEnd

Function ParcourirSauvegardes
  nsDialogs::SelectFolderDialog "Choisissez le dossier des sauvegardes" "$Sauvegardes"
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $SauvegardesInput $0
  ${EndIf}
FunctionEnd

Function DossiersPage
  !insertmacro MUI_HEADER_TEXT "Dossiers Football Manager 27" "Choisissez les dossiers a utiliser (facultatif)."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 14u "Les trois dossiers sont facultatifs. Vous pourrez les modifier dans l'application apres installation."
  Pop $0
  ${NSD_CreateLabel} 0 20u 100% 12u "Pack de logos (graphics) :"
  Pop $0
  ${NSD_CreateDirRequest} 0 34u 78% 14u "$Logos"
  Pop $LogosInput
  ${NSD_CreateBrowseButton} 80% 34u 20% 14u "Parcourir..."
  Pop $0
  ${NSD_OnClick} $0 ParcourirLogos
  ${NSD_CreateLabel} 0 54u 100% 12u "Pack de visages (faces) :"
  Pop $0
  ${NSD_CreateDirRequest} 0 68u 78% 14u "$Visages"
  Pop $VisagesInput
  ${NSD_CreateBrowseButton} 80% 68u 20% 14u "Parcourir..."
  Pop $0
  ${NSD_OnClick} $0 ParcourirVisages
  ${NSD_CreateLabel} 0 88u 100% 12u "Sauvegardes Football Manager (games) :"
  Pop $0
  ${NSD_CreateDirRequest} 0 102u 78% 14u "$Sauvegardes"
  Pop $SauvegardesInput
  ${NSD_CreateBrowseButton} 80% 102u 20% 14u "Parcourir..."
  Pop $0
  ${NSD_OnClick} $0 ParcourirSauvegardes
  ${NSD_CreateLabel} 0 124u 100% 30u "Si vous avez deja enregistre des reglages dans Assistant FM, ceux-ci restent prioritaires et ne seront pas ecrases par l'installation."
  Pop $0
  nsDialogs::Show
FunctionEnd

Function DossiersValider
  ${NSD_GetText} $LogosInput $Logos
  ${NSD_GetText} $VisagesInput $Visages
  ${NSD_GetText} $SauvegardesInput $Sauvegardes
  ${ForEach} $0 0 2 + 1
    ${Switch} $0
      ${Case} 0
        StrCpy $1 $Logos
        ${Break}
      ${Case} 1
        StrCpy $1 $Visages
        ${Break}
      ${Default}
        StrCpy $1 $Sauvegardes
    ${EndSwitch}
    ${If} $1 != ""
      ${IfNot} ${FileExists} "$1\*.*"
        MessageBox MB_OK|MB_ICONEXCLAMATION "Dossier introuvable : $1$\r$\nChoisissez un dossier existant ou laissez le champ vide."
        Abort
      ${EndIf}
    ${EndIf}
  ${Next}
FunctionEnd

Section "Application Assistant FM (obligatoire)" MainSection
  SectionIn RO
  ; Fermer l'application si elle est encore en cours d'exécution
  nsExec::Exec 'taskkill /F /IM AssistantFM.exe'
  nsExec::Exec 'taskkill /F /IM AssistantFM-extracteur.exe'
  Sleep 1500
  SetOutPath "$INSTDIR"
  File "${BUILD_DIR}\AssistantFM.exe"
  File "${BUILD_DIR}\AssistantFM-extracteur.exe"
  File "${BUILD_DIR}\Licences-tierces.txt"
  File "${BUILD_DIR}\Licences-NSIS.txt"
  File "assistantfm.ico"
  ClearErrors
  FileOpen $0 "$INSTDIR\dossiers-initiaux.txt" w
  IfErrors chemins_erreur
  FileWriteUTF16LE /BOM $0 "$Logos$\r$\n$Visages$\r$\n$Sauvegardes$\r$\n"
  FileClose $0
  IfErrors chemins_erreur chemins_ok
  chemins_erreur:
    MessageBox MB_OK|MB_ICONSTOP "Impossible d'enregistrer les dossiers Football Manager."
    SetErrorLevel 1
    Abort
  chemins_ok:
  WriteUninstaller "$INSTDIR\Desinstaller.exe"
  WriteRegStr HKCU "Software\AssistantFM\Beta" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "DisplayName" "${APP_NAME} - ${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "DisplayVersion" "${VERSION} (${VERSION_DATE})"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "Publisher" "Assistant FM"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "UninstallString" '"$INSTDIR\Desinstaller.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "DisplayIcon" "$INSTDIR\assistantfm.ico"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta" "NoRepair" 1
  ; Relancer l'application après une installation silencieuse
  IfSilent do_relaunch
  Goto relaunch_done
  do_relaunch:
  Exec '"$INSTDIR\AssistantFM.exe"'
  relaunch_done:
SectionEnd

Section /o "Raccourci sur le bureau" DesktopSection
  CreateShortcut "$DESKTOP\${APP_NAME} ${VERSION}.lnk" "$INSTDIR\AssistantFM.exe" "" "$INSTDIR\assistantfm.ico"
  WriteRegDWORD HKCU "Software\AssistantFM\Beta" "DesktopShortcut" 1
SectionEnd

Section /o "Raccourci dans le menu Démarrer" StartSection
  CreateDirectory "$SMPROGRAMS\${APP_NAME} ${VERSION}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME} ${VERSION}\${APP_NAME}.lnk" "$INSTDIR\AssistantFM.exe" "" "$INSTDIR\assistantfm.ico"
  CreateShortcut "$SMPROGRAMS\${APP_NAME} ${VERSION}\${APP_NAME} - Overlay.lnk" "$INSTDIR\AssistantFM.exe" "--overlay" "$INSTDIR\assistantfm.ico"
  WriteRegDWORD HKCU "Software\AssistantFM\Beta" "StartShortcut" 1
SectionEnd

Section "Uninstall"
  ReadRegDWORD $0 HKCU "Software\AssistantFM\Beta" "DesktopShortcut"
  ${If} $0 == 1
    Delete "$DESKTOP\${APP_NAME} ${VERSION}.lnk"
  ${EndIf}
  ReadRegDWORD $0 HKCU "Software\AssistantFM\Beta" "StartShortcut"
  ${If} $0 == 1
    Delete "$SMPROGRAMS\${APP_NAME} ${VERSION}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME} ${VERSION}\${APP_NAME} - Overlay.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME} ${VERSION}"
  ${EndIf}
  Delete "$INSTDIR\AssistantFM.exe"
  Delete "$INSTDIR\AssistantFM-extracteur.exe"
  Delete "$INSTDIR\Licences-tierces.txt"
  Delete "$INSTDIR\Licences-NSIS.txt"
  Delete "$INSTDIR\assistantfm.ico"
  Delete "$INSTDIR\dossiers-initiaux.txt"
  Delete "$INSTDIR\Desinstaller.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\AssistantFMBeta"
  DeleteRegKey HKCU "Software\AssistantFM\Beta"
SectionEnd
