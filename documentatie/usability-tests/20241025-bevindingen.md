## Over de test

- Kwalitatieve, gemodereerde gebruikerstest
- 6 deelnemers, interviews van 45 minuten
- Matig tot ervaren computergebruikers, enige bekendheid met het verkiezingsproces (5 van de 6 hadden geholpen als vrijwilliger op een stembureau)
- Getest op Windows + Chrome
- Computer met extern scherm, toetsenbord met numeriek toetsenblok en muis
- Getest op #kiesraad/abacus, commit #9420c5c
- Verkiezingsdata gebruikt voor TK2023 + echte Na31-2 bijlage 2 van _gemeente Brunssum_
- Geteste stappen:
  - Inloggen als nieuwe gebruiker (`/account/login`)
  - Invoeren van een Na 31-2 bijlage 2 voor 1 of 2 stembureaus + verschillende fouten en waarschuwingen
  - Invoer afbreken, later hervatten

## Observaties

### Inloggen
- Alle deelnemers konden inloggen met de verstrekte inloggegevens.
- De wachtwoordvereisten (8 tekens en minimaal 2 cijfers) lijken wat streng voor deze gebruiksomgeving (gecontroleerde fysieke omgeving met toegangscontrole, geen internetverbinding).
  - [ ] Heroverweeg wachtwoordvereisten

### Papieren formulieren (Na 31-2 bijlage 2)
- Het nummer van het stembureau op het papieren formulier is moeilijk te vinden / te klein
- Als een lijst meer dan 50 kandidaten heeft (verdeeld over 2 pagina's), vulden sommige gebruikers het ‘subtotaal van kolom 1+2’ op pagina 1 in als het *totaal aantal stemmen* voor die partij. Pagina 1 en pagina 2 van de lijst lijken te veel op elkaar.
  - [ ] Verwijder het subtotaal van heel pagina 1 van het papieren formulier en toon alleen op de laatste pagina van een lijst het veld met het generaal totaal voor die lijst.

### Pagina keuze stembureau
- Het invoeren van het stembureaunummer ging moeiteloos
- De terugkoppeling met de naam van het stembureau werd opgemerkt en gecontroleerd
- Bij invoer van een stembureau dat al door iemand anders is afgerond, was de terugkoppeling niet duidelijk genoeg
  - [ ] Update terugkoppeling: kiesraad/abacus/issues/388
- Wanneer een gebruiker onvoltooide invoer had die hervat kon worden, werd er een melding getoond. Eén gebruiker sloot deze melding, waardoor het moeilijker werd om de invoer te hervatten.
  - [x] Verwijder het sluit-icoon op deze waarschuwing (opgelost in kiesraad/abacus/pull/481)

### Gegevensinvoer - stap specifiek
#### Stap 1: Herteld?
- Alle gebruikers hadden moeite om het juiste deel van het papieren formulier te vinden waar deze vraag op sloeg.
  - [x] Update tekst van de vraag, maak duidelijk dat deze verwijst naar of het selectievakje op de eerste pagina is aangevinkt. (opgelost in kiesraad/abacus/issues/399)

#### Stap 2: Toegelaten kiezers en getelde stemmen
- Gebruikers leken zich niet bewust van de letters naast de invoervelden en hoe deze verwijzen naar de letters op het papieren formulier.
- Bij antwoord "ja" op ‘herteld’ worden in de volgende stap de velden A.2-D.2 getoond. Doordat de vraag soms onjuist werd beantwoord, werden A.2-D.2 soms getoond terwijl deze velden leeg waren op hun formulier. Het leeglaten van A.2-D.2 leidt tot foutmeldingen in de sectie 'verschillen', omdat het totale aantal kiezers dan op 0 wordt gesteld.
  - [ ] Het leeglaten van A.2-D.2 moet resulteren in een blokkerende foutmelding

#### Stap 3: Verschillen
De papieren formulieren gebruikten een oudere lay-out van deze sectie (TK2023) vergeleken met de implementatie in Abacus (EP2024). Dit verklaart deels waarom gebruikers moeite hadden met deze sectie. De volgende problemen blijven:
- Meerdere gebruikers berekenden het verschil tussen het totale aantal kiezers en stemmen zelf, in plaats van dit over te nemen van het papier. Bij handmatige berekeningen werden de getallen correct ingevuld.
- Sommige gebruikers vulden overal een nul in, waar het papieren formulier lege velden had.
- Onvoldoende duidelijk welke sectie van het formulier deze stap betreft.
  - [ ] Voeg sectienummers toe aan paginatitels.
- De tekst voor het veld "andere verklaring" kan worden geïnterpreteerd alsof er iets anders dan alleen een getal nodig is.

#### Stap n: Lijsten
- De invoer "Totaal lijst x" wordt vaak over het hoofd gezien/vergeten. Abacus scrollt gebruikers dan naar de bovenkant van de pagina en toont fout F.401 (totalen komen niet overeen met stemmen op kandidaten). Gebruikers hebben vrij lang nodig om de fout te herstellen.
  - [x] Versnel foutherstel door een specifieke foutmelding onderaan de pagina weer te geven wanneer "Totaal lijst X" leeg is (en er wel stemmen op kandidaten zijn) (zie [Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=6128-28260&node-type=frame&t=VOfeUhME521tHpCy-11)) (opgelost in kiesraad/abacus/issues/500)

#### Stap: Controleren en opslaan
- Verschillende gebruikers waren verward door de `Op [Lijst 2](#) zijn geen stemmen` feedback, onzeker of ze een fout hadden gemaakt.
  - [x] Overweeg om deze feedback te verwijderen, aangezien per ongeluk overgeslagen lijsten al leiden tot fout F.204 (totalen komen niet overeen) en zo alsnog worden opgemerkt. (opgelost in kiesraad/abacus/501)
- De tekst en het icoon van de feedback 'stap x heeft geaccepteerde waarschuwingen' veroorzaakten ook verwarring.
  - [x] Overweeg om het icoon voor dit bericht te wijzigen naar een groene vink in plaats van een waarschuwingsicoon. (opgelost in kiesraad/abacus/issues/502)
- De laatste regel 'Je kan de resultaten van dit stembureau opslaan' werd nauwelijks opgemerkt.
  - [x] Overweeg om extra witruimte voor deze regel toe te voegen om deze conclusie beter te laten opvallen. (opgelost in kiesraad/abacus/pull/525)

### Gegevensinvoer - algemene bevindingen
#### Toetsenbord- en muisgebruik
- Sommige gebruikers hielden het papier dat ze overnamen in hun hand, waardoor ze slechts één hand voor hun muis en toetsenbord konden gebruiken.
- Sommige gebruikers hielden hun hand constant op de muis.
- De meeste gebruikers bleven hun muis gebruiken, zelfs in situaties waarin het toetsenbord sneller en efficiënter was. Redenen:
  - Bij navigeren naar een volgende stap plaatsen we de focus op de titel van die sectie in plaats van op het eerste invoerveld (voor toegankelijkheid). Gebruikers wisten niet hoe ze met het toetsenbord de focus naar het eerste invoerveld konden verplaatsen en gebruikten hun muis.
    - [x] Zet de focus bij het laden van de volgende stap op het eerste invoerveld in plaats van op de titel. Zorg dat de gekozen oplossing toegankelijk is (gebruik `aria-announce` of iets vergelijkbaars om de context van het gefocuste invoerveld aan te geven). (opgelost in kiesraad/abacus/issues/503)
  - Sommige gebruikers gebruikten `Tab` of de `pijl-omlaag` om binnen een formulier te navigeren.
  - Geen enkele gebruiker gebruikte `Enter` om naar het volgende invoerveld te navigeren.
- De toetsenbord-tips (`Shift`+`Enter` om pagina te verzenden en `Shift` + `pijl-omlaag` om naar het laatste invoerveld te navigeren) werden nauwelijks ontdekt. Zelfs wanneer erop gewezen, werden ze nog steeds niet vaak gebruikt.
- Een (ervaren met gegevensinvoer) deelnemer vroeg om een keyboard shortcut om snel grote delen van de lijst over te slaan of naar een specifieke kandidaat te springen.
  - [ ] kiesraad/abacus/issues/342
- Wanneer de focus op het laatste invoerveld in het formulier (lijsttotaal) staat, is het nogal omslachtig om `Shift`+`Enter` te gebruiken om het formulier te verzenden. De meeste gebruikers gebruikten hiervoor beide handen.
  - Overweeg het verwijderen van de `Shift`+`Enter` hint, omdat tweemaal `Enter` drukken efficiënter is (kan met één hand worden gedaan).
- Een gebruiker vulde een nul in op elk leeg veld op het papieren formulier, wat de gegevensinvoer aanzienlijk vertraagde.
- De meeste gebruikers gebruikten niet het numerieke toetsenblok, maar de cijfers bovenaan het toetsenbord. Sommige gebruikers gaven aan dit gewend te zijn vanwege een laptop zonder numeriek toetsenblok.
- [ ] Overweeg om een onboarding/tutorial toe te voegen voor eerste gebruikers die:
 - Uitlegt dat het papieren formulier leidend is en zelf geen getallen moeten worden berekend
 - Hen instrueert om de coördinator te informeren bij fouten op het formulier
 - Hen instrueert geen nullen in te voeren
 - Hen laat oefenen met deze toetsenbordsneltoetsen

#### Fouten en waarschuwingen
- De meeste gebruikers lazen foutmeldingen en waarschuwingen niet volledig.
  - [ ] Verkort de tekst van deze meldingen.
- Als gebruikers fout F.204 tegenkomen, worden ze teruggestuurd naar de stap 'aantal kiezers en getelde stemmen'. Als ze daar een fout ontdekken, is het een beetje verwarrend hoe ze verder moeten gaan en het formulier kunnen voltooien.

#### Afbreken en hervatten van gegevensinvoer
- Sommige gebruikers aarzelden om "Invoer afbreken" te gebruiken omdat het leek alsof hun invoer verloren zou gaan.
  - [ ] Overweeg het label te hernoemen naar "Invoer onderbreken"
