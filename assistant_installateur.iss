#ifndef BuildDirectory
  #error BuildDirectory doit désigner le dossier de construction.
#endif
#ifndef OutputDirectory
  #error OutputDirectory doit désigner le dossier de sortie.
#endif

[Setup]
AppId={{8E7285BE-C092-4E16-8C19-7B7BEBEC8F90}
AppName=Assistant FM
AppVersion=1.0.0
AppPublisher=Assistant FM
DefaultDirName={sd}\Assistant FM
DefaultGroupName=Assistant FM
PrivilegesRequired=admin
OutputDir={#OutputDirectory}
OutputBaseFilename=AssistantFM-Installation
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\AssistantFM.exe
SetupIconFile=assistantfm.ico

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Files]
Source: "{#BuildDirectory}\AssistantFM.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDirectory}\AssistantFM-extracteur.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDirectory}\Licences-tierces.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "assistantfm.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\Assistant FM"; Filename: "{app}\AssistantFM.exe"; IconFilename: "{app}\assistantfm.ico"; Tasks: startmenuicon
Name: "{userdesktop}\Assistant FM"; Filename: "{app}\AssistantFM.exe"; IconFilename: "{app}\assistantfm.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Créer un raccourci sur le bureau"
Name: "startmenuicon"; Description: "Créer un raccourci dans le menu Démarrer"

[Run]
Filename: "{app}\AssistantFM.exe"; Description: "Lancer Assistant FM"; Flags: nowait postinstall skipifsilent

[Code]
var
  PathsPage: TInputDirWizardPage;
  GraphicsDir: String;
  LogoPackLink: TNewStaticText;
  FacePackLink: TNewStaticText;

procedure OpenDiscord(Sender: TObject);
var
  ErrorCode: Integer;
begin
  if not ShellExec('open', 'https://discord.gg/YR2e8kMHeF', '', '',
    SW_SHOWNORMAL, ewNoWait, ErrorCode) then
    MsgBox('Impossible d''ouvrir le Discord communautaire.', mbError, MB_OK);
end;

procedure OpenLogoPack(Sender: TObject);
var
  ErrorCode: Integer;
begin
  if not ShellExec('open', 'https://www.tcmlogos.com/fr/tcm27-logos-fm27/', '', '',
    SW_SHOWNORMAL, ewNoWait, ErrorCode) then
    MsgBox('Impossible d''ouvrir la page du pack de logos.', mbError, MB_OK);
end;

procedure OpenFacePack(Sender: TObject);
var
  ErrorCode: Integer;
begin
  if not ShellExec('open', 'https://www.tcmlogos.com/fr/df11-facepack/', '', '',
    SW_SHOWNORMAL, ewNoWait, ErrorCode) then
    MsgBox('Impossible d''ouvrir la page du pack de visages.', mbError, MB_OK);
end;

procedure InitializeWizard;
var
  CommunityPage: TWizardPage;
  CommunityIcon: TNewStaticText;
  CommunityText: TNewStaticText;
  CommunityLink: TNewStaticText;
begin
  CommunityPage := CreateCustomPage(wpWelcome, 'Communauté Assistant FM',
    'Retrouvez les autres utilisateurs sur Discord');
  CommunityIcon := TNewStaticText.Create(CommunityPage.Surface);
  CommunityIcon.Parent := CommunityPage.Surface;
  CommunityIcon.Caption := '💬';
  CommunityIcon.Font.Name := 'Segoe UI Emoji';
  CommunityIcon.Font.Size := 24;
  CommunityIcon.Left := ScaleX(0);
  CommunityIcon.Top := ScaleY(8);
  CommunityText := TNewStaticText.Create(CommunityPage.Surface);
  CommunityText.Parent := CommunityPage.Surface;
  CommunityText.Caption := 'Échangez avec la communauté, posez vos questions et partagez vos suggestions.';
  CommunityText.AutoSize := False;
  CommunityText.WordWrap := True;
  CommunityText.Left := ScaleX(48);
  CommunityText.Top := ScaleY(10);
  CommunityText.Width := CommunityPage.SurfaceWidth - ScaleX(48);
  CommunityText.Height := ScaleY(40);
  CommunityLink := TNewStaticText.Create(CommunityPage.Surface);
  CommunityLink.Parent := CommunityPage.Surface;
  CommunityLink.Caption := 'Rejoindre le Discord communautaire';
  CommunityLink.Cursor := crHand;
  CommunityLink.Font.Color := clBlue;
  CommunityLink.Font.Style := [fsUnderline];
  CommunityLink.OnClick := @OpenDiscord;
  CommunityLink.Left := ScaleX(48);
  CommunityLink.Top := ScaleY(58);

  PathsPage := CreateInputDirPage(wpSelectDir, 'Dossiers Football Manager',
    'Choisissez les dossiers à utiliser', 'Les packs sont facultatifs : laissez leur champ vide si vous n''en avez pas. Emplacement habituel : Documents\Sports Interactive\Football Manager 27\graphics.', False, '');
  PathsPage.Add('Dossier Logos (facultatif) :');
  PathsPage.Add('Dossier Visages (facultatif) :');
  PathsPage.Add('Dossier des sauvegardes :');
  LogoPackLink := TNewStaticText.Create(PathsPage.Surface);
  LogoPackLink.Parent := PathsPage.Surface;
  LogoPackLink.Caption := 'Télécharger TCM Logos';
  LogoPackLink.Cursor := crHand;
  LogoPackLink.Font.Color := clBlue;
  LogoPackLink.Font.Style := [fsUnderline];
  LogoPackLink.OnClick := @OpenLogoPack;
  LogoPackLink.Left := ScaleX(230);
  LogoPackLink.Top := PathsPage.Edits[0].Top - ScaleY(20);
  FacePackLink := TNewStaticText.Create(PathsPage.Surface);
  FacePackLink.Parent := PathsPage.Surface;
  FacePackLink.Caption := 'Télécharger DF11 Facepack';
  FacePackLink.Cursor := crHand;
  FacePackLink.Font.Color := clBlue;
  FacePackLink.Font.Style := [fsUnderline];
  FacePackLink.OnClick := @OpenFacePack;
  FacePackLink.Left := ScaleX(230);
  FacePackLink.Top := PathsPage.Edits[1].Top - ScaleY(20);
  PathsPage.Values[0] := '';
  PathsPage.Values[1] := '';
  GraphicsDir := ExpandConstant('{userdocs}\Sports Interactive\Football Manager 27\graphics');
  if DirExists(GraphicsDir) then begin
    PathsPage.Values[0] := GraphicsDir;
    if DirExists(GraphicsDir + '\faces') then
      PathsPage.Values[1] := GraphicsDir + '\faces'
    else
      PathsPage.Values[1] := GraphicsDir;
  end;
  PathsPage.Values[2] := ExpandConstant('{userdocs}\Sports Interactive\Football Manager 27\games');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  I: Integer;
begin
  Result := True;
  if CurPageID = PathsPage.ID then begin
    for I := 0 to 2 do begin
      if (PathsPage.Values[I] <> '') and not DirExists(PathsPage.Values[I]) then begin
        MsgBox('Ce dossier est introuvable : ' + PathsPage.Values[I] + #13#10 + 'Choisissez un dossier existant ou laissez le champ vide.', mbError, MB_OK);
        Result := False;
        exit;
      end;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Paths: TArrayOfString;
begin
  if CurStep = ssPostInstall then begin
    SetArrayLength(Paths, 3);
    Paths[0] := PathsPage.Values[0];
    Paths[1] := PathsPage.Values[1];
    Paths[2] := PathsPage.Values[2];
    if not SaveStringsToUTF8File(ExpandConstant('{app}\dossiers-initiaux.txt'), Paths, False) then
      RaiseException('Impossible d''enregistrer les chemins de dossiers.');
  end;
end;
