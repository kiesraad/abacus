; Made with InnoSetup 6.6, make sure to use this version
; Using a different version of InnoSetup can give different results

#define GetVersion() \
  Local[0] = \
    "/S /C pushd """ + SourcePath + """ && " + \
    "(git.exe describe --tags --exact-match HEAD > version.txt 2>nul " + \
    "|| for /f %a in ('git.exe rev-parse --short HEAD') do echo dev-%a > version.txt) " + \
    "&& popd", \
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
#define MyDatabaseFile = "db.sqlite"

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
DefaultDirName={userappdata}\{#MyAppName}
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
PrivilegesRequired=lowest
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

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppIcon}"
Name: "{autodesktop}\1. Start {#MyAppName} server"; Filename: "{sys}\cmd.exe"; Parameters: "/k ""{app}\{#MyAppExeName}"""; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppIcon}"
Name: "{autodesktop}\2. Open {#MyAppName} in browser"; Filename: "http://localhost"; IconFilename: "{app}\{#MyAppIcon}"
Name: "{autodesktop}\{#MyAppName} database map"; Filename: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 3

[Run]
Filename: "{tmp}\VC_redist.x64.exe"; Parameters: "/install /passive /norestart"; StatusMsg: "Visual C++ Redistributable installeren..."
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
Filename: "http://localhost"; Description: "Open Abacus Interface"; Flags: shellexec postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""Abacus server"" "; Flags: runhidden; RunOnceId: "RemoveFirewallExc"

[Messages]
WizardReady=Klaar om [name] te installeren
ReadyLabel1=U gaat de [name] server installeren op deze computer.
ReadyLabel2b=Het installatieprogramma vraagt een aantal keren om toestemming om hulpprogramma’s te kunnen installeren. Deze toestemming is nodig om Abacus goed te laten werken. Beantwoord deze vragen met ‘Ja’.

FinishedHeadingLabel=[name] is geïnstalleerd
FinishedLabel=De installatie van [name] server is klaar.%n%nU kunt Abacus server starten via de snelkoppeling op het bureaublad. Doe dit pas nadat de internetverbinding van deze computer is verbroken.%n%nAls de server is gestart, kunt u Abacus inrichten via de snelkoppeling ‘Open [name]’.

[Code]
procedure RunElevatedCommandWithRetry(const CmdLine, ActionDescription: String);
var
  ResultCode: Integer;
  Retry: Boolean;
  MsgRes: Integer;
begin
  repeat
    Retry := False;

    if not ShellExec('runas', ExpandConstant('{sys}\cmd.exe'),
      '/c ' + CmdLine, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    begin
      MsgRes := MsgBox(
        ActionDescription + ' vereist administratorrechten.'#13#13 +
        'Wilt u het opnieuw proberen?',
        mbConfirmation, MB_YESNO or MB_DEFBUTTON2);
      if MsgRes = IDYES then
        Retry := True;
    end
    else
    begin
      if ResultCode = 0 then
        MsgBox(ActionDescription + ' is succesvol uitgevoerd.', mbInformation, MB_OK)
      else
        MsgBox(ActionDescription + ' kon niet worden uitgevoerd (foutcode: ' + IntToStr(ResultCode) + ').',
               mbError, MB_OK);
    end;
  until not Retry;
end;

procedure InitializeWizard();
begin
  // Spacing of icon
  WizardForm.WizardSmallBitmapImage.Top := WizardForm.WizardSmallBitmapImage.Top + ScaleY(10);
  WizardForm.WizardSmallBitmapImage.Height := WizardForm.WizardSmallBitmapImage.Height - ScaleY(10);
  WizardForm.WizardSmallBitmapImage.Width := WizardForm.WizardSmallBitmapImage.Width - ScaleY(10);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  CmdLine: String;
begin
  if CurStep = ssPostInstall then
    begin
      CmdLine :=
        'netsh advfirewall firewall delete rule name="Abacus server" >nul 2>&1 & ' +
        'netsh advfirewall firewall add rule name="Abacus server" ' +
        'program="' + ExpandConstant('{app}\{#MyAppExeName}') + '" ' +
        'protocol=TCP dir=in localport=80 action=allow';
      RunElevatedCommandWithRetry(CmdLine, 'Het toevoegen van de firewallregel');
    end;
end;

procedure CurUninstallStepChanged(CurStep: TUninstallStep);
begin
  if CurStep = usUninstall then
    begin
      // Check if DB exists and ask question in case
      if FileExists(ExpandConstant('{app}\{#MyDatabaseFile}')) then
        begin
        case TaskDialogMsgBox('Database verwijderen?',
                     'De database bevat alle verkiezingsdetails, ingevoerde data en gemaakte processen-verbaal.' + #13#10#13#10 + 'Als u de database verwijdert, gaan deze gegevens definitief verloren.',
                      mbConfirmation,
                      MB_YESNO, ['Database verwijderen', 'Bewaren'],
                      0) of
          IDYES: begin
            MsgBox('Database wordt verwijderd', mbInformation, MB_OK);
            DelTree(ExpandConstant('{userappdata}\{#MyAppName}'), True, True, True);
          end;
          IDNO: MsgBox('Database wordt behouden', mbInformation, MB_OK);
        end;
      end;

      RunElevatedCommandWithRetry('netsh advfirewall firewall delete rule name="Abacus server"', 'Het verwijderen van de firewallregel');
    end;
end;
