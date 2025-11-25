# Windows installer

Volg de onderstaande stappen om de installer te compileren:

1. [Download Inno Setup 6.6](https://jrsoftware.org/) en installeer deze. Gebruik deze versie om zeker te zijn van het juiste resultaat.
2. [Download Visual C++ Redistributable v14 installer](https://aka.ms/vc14/vc_redist.x64.exe) naar deze folder en sla deze op als `VC_redist.x64.exe`.
3. Plaats een recente Abacus build voor Windows in deze folder onder de naam `abacus.exe`.
4. Open `abacus.iss` met Inno Setup en kies in het menu `Build -> Compile` of gebruik de toetscombinatie Ctrl+F9.
