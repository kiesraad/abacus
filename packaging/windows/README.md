# Windows installer

Follow the next steps to compile the installer:

1. Download and install [Inno Setup 6.6](https://jrsoftware.org/). Use this version to get the same result.
2. [Download Visual C++ Redistributable v14 installer](https://aka.ms/vc14/vc_redist.x64.exe) to this folder and save it as `VC_redist.x64.exe`.
3. Place a recent Abacus build for Windows in this folder under the name `abacus.exe`.
4. Open `abacus.iss` with Inno Setup and select `Build -> Compile` in the menu or use the keyboard shortcut Ctrl+F9.
