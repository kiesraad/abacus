; Made with InnoSetup 6.7, make sure to use this version
; Using a different version of InnoSetup can give different results

#define GetVersion() \
  Local[0] = \
    "/S /C pushd """ + SourcePath + """ && """ +  MyAppExeName + """ -V > version.txt && popd", \
  Local[1] = Exec("cmd.exe", Local[0], "C:\\", , SW_HIDE), \
  Local[2] = FileOpen(AddBackslash(SourcePath) + "version.txt"), \
  Local[3] = FileRead(Local[2]), \
  FileClose(Local[2]), \
  DeleteFile(AddBackslash(SourcePath) + "version.txt"), \
  Trim(Local[3])

#define MyAppName "Abacus"
#define MyAppPublisher "Kiesraad"
#define MyAppURL "https://github.com/kiesraad/abacus"
#define MyAppExeName "abacus.exe"
#define MyAppIcon "abacus.ico"
#define MyDataDir "{commonappdata}\Abacus"
#define MyFirewallRule "Abacus server"
#define MyCAName "Abacus Local CA"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{8475448A-D5A3-4114-BD32-CDE54A5E2FB5}}
AppName={#MyAppName}
AppVersion={#GetVersion()}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
; Setup will not show the Select Destination Location wizard page.
DisableDirPage=yes
; "ArchitecturesAllowed=x64compatible" specifies that Setup cannot run
; on anything but x64 and Windows 11 on Arm.
ArchitecturesAllowed=x64compatible
; "ArchitecturesInstallIn64BitMode=x64compatible" requests that the
; install be done in "64-bit mode" on x64 or Windows 11 on Arm,
; meaning it should use the native 64-bit Program Files directory and
; the 64-bit view of the registry.
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputBaseFilename=abacussetup
; VC_redist can be eager to restart the system, but this breaks post-install run actions
RestartIfNeededByRun=no
SetupIconFile={#MyAppIcon}
SolidCompression=yes
UninstallDisplayIcon={app}\{#MyAppIcon}
; BBGGRR
WizardImageBackColor=$59320f
WizardImageFile=abacus_wizard.png
WizardSmallImageBackColor=clNone
WizardSmallImageFile=abacus_wizard_small.png
WizardStyle=modern

; For signing the (un)installer and program, uncomment the configuration and follow the steps below.
; 1. Download Windows SDK: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/ and install component "Windows SDK Signing Tools for Desktop Apps".
; 2. Install the SafeNet drivers: https://support.globalsign.com/digital-certificates/manage-safeNet-eToken/safenet-drivers
; 3. Find path to signtool.exe, e.g. "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe"
; 4. Add signtool via menu "Tools -> Configure Sign Tools...", click "Add", use name "winsign" and "C:\your\path\to\signtool.exe $p" as the command.
; 5. Insert the USB stick with certificate into the computer
;SignTool=winsign sign /a /tr http://timestamp.globalsign.com/tsa/r6advanced1 /td SHA256 /fd SHA256 $f
;SignedUninstaller=yes

[Languages]
Name: "dutch"; MessagesFile: "compiler:Languages\Dutch.isl"

[Files]
; NOTE: Don't use "Flags: ignoreversion" on any shared system files
Source: ".\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion sign
Source: ".\VC_redist.x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: ".\{#MyAppIcon}"; DestDir: "{app}"

[Dirs]
Name: "{app}"; Flags: uninsalwaysuninstall
Name: "{#MyDataDir}\backups"; Flags: uninsneveruninstall
Name: "{#MyDataDir}\logs"; Flags: uninsneveruninstall

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "https://localhost"; IconFilename: "{app}\{#MyAppIcon}"
Name: "{autodesktop}\Open {#MyAppName} in browser"; Filename: "https://localhost"; IconFilename: "{app}\{#MyAppIcon}"
Name: "{autodesktop}\{#MyAppName} data"; Filename: "{#MyDataDir}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 3

[Run]
Filename: "{tmp}\VC_redist.x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Visual C++ Redistributable installeren..."
Filename: "https://localhost"; Description: "Open Abacus Interface"; Flags: shellexec postinstall skipifsilent

[Messages]
WizardReady=Klaar om [name] te installeren
ReadyLabel1=Abacus wordt op deze computer geïnstalleerd.
ReadyLabel2b={#MyAppName} wordt geïnstalleerd als Windows-service. De service start automatisch wanneer Windows opstart.

FinishedHeadingLabel=Abacus is geïnstalleerd en gestart.
FinishedLabel=Abacus is klaar voor gebruik en start voortaan automatisch wanneer de computer wordt aangezet.%n%nDubbelklik op de snelkoppeling ‘Open Abacus in browser’ op het bureaublad om gebruikers aan te maken en verkiezingen in te richten.

[Code]
function AppExe(): String;
begin
  Result := ExpandConstant('{app}\{#MyAppExeName}');
end;

function DataDir(): String;
begin
  Result := ExpandConstant('{#MyDataDir}');
end;

// Run a command and shows an error if it fails
function RunStep(const Description, Filename, Params, Hint: String): Boolean;
var
  ResultCode: Integer;
  Message: String;
begin
  Result := Exec(Filename, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
  if not Result then
  begin
    Message := Description + ' is mislukt (foutcode: ' + IntToStr(ResultCode) + ').';
    if Hint <> '' then
      Message := Message + #13#10#13#10 + Hint;
    MsgBox(Message, mbError, MB_OK);
  end;
end;

// Runs a command and returns whether it has succeeded
function Succeeds(const Filename, Params: String): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(Filename, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Show what the installer is doing on the progress page
procedure ShowStatus(const Text: String);
begin
  WizardForm.StatusLabel.Caption := Text;
  WizardForm.FilenameLabel.Caption := '';
end;

procedure InitializeWizard();
begin
  // Spacing of icon
  WizardForm.WizardSmallBitmapImage.Top := WizardForm.WizardSmallBitmapImage.Top + ScaleY(10);
  WizardForm.WizardSmallBitmapImage.Height := WizardForm.WizardSmallBitmapImage.Height - ScaleY(10);
  WizardForm.WizardSmallBitmapImage.Width := WizardForm.WizardSmallBitmapImage.Width - ScaleY(10);
end;

function InitializeSetup(): Boolean;
begin
  // Check if an installation already exists
  Result := not FileExists(ExpandConstant('{autopf}\{#MyAppName}\{#MyAppExeName}'));
  if not Result then
    MsgBox('Abacus is al geïnstalleerd op deze computer. Verwijder eerst de bestaande installatie en start daarna deze installatie opnieuw.', mbError, MB_OK);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    begin
      // Generate the CA by running `--init-tls`
      ShowStatus('Beveiligingscertificaat aanmaken...');
      if RunStep('Het aanmaken van het beveiligingscertificaat', AppExe(),
          '--init-tls --tls-dir "' + DataDir() + '\tls"',
          '') then
      begin
        // Install the CA to the machine root store
        ShowStatus('Beveiligingscertificaat installeren...');
        RunStep('Het installeren van het beveiligingscertificaat', ExpandConstant('{sys}\certutil.exe'),
          '-f -addstore root "' + DataDir() + '\tls\ca.cer"',
          'Installeer het beveiligingscertificaat handmatig volgens de gebruikershandleiding.');
      end;

      ShowStatus('Firewall instellen...');
      // Remove existing firewall rule if it exists
      if Succeeds(ExpandConstant('{sys}\netsh.exe'), 'advfirewall firewall show rule name="{#MyFirewallRule}"') then
        RunStep('Het verwijderen van de bestaande firewallregel', ExpandConstant('{sys}\netsh.exe'),
          'advfirewall firewall delete rule name="{#MyFirewallRule}"', '');

      // Create firewall rule
      RunStep('Het instellen van de firewall', ExpandConstant('{sys}\netsh.exe'),
        'advfirewall firewall add rule name="{#MyFirewallRule}" program="' + AppExe() + '" ' +
        'protocol=TCP dir=in localport=80,443 action=allow', '');

      // Install and start the service
      ShowStatus('Abacus-service installeren...');
      RunStep('Het installeren van de Abacus-service', AppExe(), '--service --install', '');
    end;
end;

procedure CurUninstallStepChanged(CurStep: TUninstallStep);
begin
  if CurStep = usUninstall then
    begin
      // Stop and uninstall the service first to remove any file locks
      RunStep('Het verwijderen van de Abacus-service', AppExe(), '--service --uninstall', '');

      case TaskDialogMsgBox('Database, back-ups en logbestanden verwijderen?',
                   'De database bevat alle verkiezingsgegevens, ingevoerde gegevens en gemaakte processen-verbaal. Ook alle back-ups en logbestanden worden verwijderd.' + #13#10#13#10 + 'Let op: Verwijderde gegevens kunnen niet worden hersteld.',
                    mbConfirmation,
                    MB_YESNO, ['Verwijder database, back-ups en logbestanden', 'Gegevens bewaren'],
                    0) of
        IDYES: begin
          if DelTree(DataDir(), True, True, True) then
            MsgBox('Database, back-ups en logbestanden zijn verwijderd.', mbInformation, MB_OK)
          else
            MsgBox('De database, back-ups en logbestanden konden niet volledig worden verwijderd. Verwijder de map ' + DataDir() + ' handmatig.', mbError, MB_OK);
        end;
        IDNO: MsgBox('Database, back-ups en logbestanden zijn niet verwijderd. Ze blijven beschikbaar in de map ' + DataDir(), mbInformation, MB_OK);
      end;

      // Delete the CA from the machine root store by name and delete firewall rule
      if Succeeds(ExpandConstant('{sys}\certutil.exe'), '-store root "{#MyCAName}"') then
        RunStep('Het verwijderen van het beveiligingscertificaat', ExpandConstant('{sys}\certutil.exe'),
          '-delstore root "{#MyCAName}"', '');
      if Succeeds(ExpandConstant('{sys}\netsh.exe'), 'advfirewall firewall show rule name="{#MyFirewallRule}"') then
        RunStep('Het verwijderen van de firewallregel', ExpandConstant('{sys}\netsh.exe'),
          'advfirewall firewall delete rule name="{#MyFirewallRule}"', '');
    end;
end;
