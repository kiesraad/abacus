## Over de test

- Unmoderated test
- 6 deelnemers, in koppeltjes van 2 pv's invoeren
- Ervaren OSV invoerders
- Getest op Linux + Firefox
- Computer op laptop met toetsenbord met numeriek toetsenblok
- Getest op #kiesraad/abacus, commit c367769
- Dummy verkiezingsdata gebruikt (gemeente Juinen)
- Geteste stappen:
  - Invoeren van een Na 31-2 bijlage 2 voor 1 of 2 stembureaus + verschillende fouten en waarschuwingen

## Observaties (nieuw ten opzichte van vorige testmoment)

### Proces
- De geïnterviewde verkiezingsleider had de wens om ook bij blokkerende fouten de invoer af te laten kunnen maken. Doel: alle fouten in een proces-verbaal vinden, zodat die met een goede opsomming terug kan naar de teltafel. "Als er 1 fout in een proces-verbaal zit, is de kans groot dat er meer zijn". Het proces-verbaal al bij de eerste fout terugsturen geeft risico dat alleen die fout wordt opgelost, en dan gaat het proces-verbaal pingpongen tussen teltafel en invoerders, en dat kost veel tijd (want moet telkens ingepakt voor transport naar andere afdeling)

### Stembureau kiezen
- De link 'bekijk de lijst met alle stembureaus' is wat verwarrend. Het is niet duidelijk dat het gaat om alle stembureaus waarvoor nog invoer gedaan moet worden.
  - Overweeg het label aan te passen naar 'Bekijk de lijst met alle stembureaus die nog ingevoerd moeten worden'

### Gegevensinvoer - stap specifiek
#### Stap 1: Vinkje op proces-verbaal?
- De [nieuwe copy van deze stap](https://github.com/kiesraad/abacus/issues/399) roept minder vragen op dan voorheen. Het vinkje blijft lastig te vinden op het proces-verbaal. 

#### Stap 2: Toegelaten kiezers en getelde stemmen
- Letters bij de invoervelden werden goed opgemerkt door deze doelgroep.

#### Stap 3: Verschillen
- Een enkeling verwacht bij 'N: Andere verklaring voor het verschil' een tekstuele toelichting in te moeten voeren in plaats van een getal.

#### Stap n: Lijsten
- De [foutmelding bij het leeglaten van het totaalveld](https://github.com/kiesraad/abacus/issues/500) wordt goed opgemerkt, en helpt gebruikers snel verder.
- De [focus op het eerste invoerveld van het formulier zetten](https://github.com/kiesraad/abacus/issues/503) leidt tot minder muisgebruik dan tijdens vorige tests

#### Stap: Controleren en opslaan
- Het [niet meer tonen van leeg gelaten lijsten](https://github.com/kiesraad/abacus/issues/501) en het [vervangen van het waarschuwingsicoon door een groene vink bij geaccepteerde waarschuwingen](https://github.com/kiesraad/abacus/issues/502) heeft het gewenste effect. Gebruikers ervaren geen issues meer bij deze stap.

### Gegevensinvoer - algemene bevindingen
#### Toetsenbord- en muisgebruik
- Ook deze groep merkt de hints over hoe het toetsenbord te gebruiken niet spontaan op. Sommigen vragen wel of er een mogelijkheid is om snel naar de onderkant van een lijst te gaan. Eenmaal gewezen op de betreffende toetsen-combinaties worden deze gebruikt
  - Overweeg de [onboarding](https://github.com/kiesraad/abacus/issues/597) meer prioriteit te geven. Of een papieren cheat-sheet te ontwikkelen met uitleg over de keyboard-shortcuts.
- Sommige gebruikers gebruiken herhaaldelijk pijltje naar beneden om naar de onderkant van het formulier te komen. Soms drukken ze net te vaak, en zitten ze weer aan de bovenkant van het formulier. Dat haalt ze uit hun flow, opnieuw naar de onderkant van het formulier navigeren kost relatief veel extra tijd.
  - Zorg dat [het pijltje naar beneden op het laatste veld niks doet](https://github.com/kiesraad/abacus/issues/624)  

#### Fouten en waarschuwingen
- Enkeling wil op foutmeldingen kunnen klikken en snel naar (eerste) veld springen waarop de foutmelding van toepassing is (zo werkt het in OSV)

#### Viewport
- De eerste keer dat gebruikers een pagina tegenkomen waar de 'volgende' knop buiten beeld staat, is het even zoeken naar 'hoe verder'. Voters and votes komt op laptopschermen vaak precies lastig uit. Alle invoervelden staan boven de fold, de knop net buiten beeld.

### Footer
- In de footer van de geteste versie stonden linkjes naar de GitHub branch. Een enkeling klikte hier op. Aangezien Abacus airgapped draaide, werkte deze links niet en lijkt er iets stuk.

