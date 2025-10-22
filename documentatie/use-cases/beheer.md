# Beheer

## De beheerder richt de applicatie in voor GSB en/of CSB (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

1. [De beheerder installeert de applicatie.](#de-beheerder-installeert-de-applicatie-zee)
2. De beheerder maakt voor zichzelf een eerste account en wachtwoord aan.
3. [De beheerder zet de verkiezingen in de applicatie.](#de-beheerder-zet-de-verkiezingen-in-de-applicatie-vis)
4. [De beheerder maakt de gebruikers aan.](#de-beheerder-maakt-de-gebruikers-aan-zee)


## De beheerder installeert de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder bereidt één computer als Abacus-server voor.
2. De beheerder downloadt de applicatie.
3. De beheerder plaatst de applicatie op de server.
4. De beheerder start de applicatie.
5. (voor elk invoerstation) De beheerder bereidt de computer als invoerstation voor.
6. (voor elk invoerstation) De beheerder zorgt dat het invoerstation met de server kan verbinden.

__Uitbreidingen:__  
1a. De beheerder bereidt één of meerdere reserve-servers voor:

4a. De applicatie geeft een foutmelding tijdens het starten:


## De beheerder zet de verkiezingen in de applicatie (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. [De beheerder leest de verkiezingsdefinitie (EML 110a) in.](#de-beheerder-leest-de-verkiezingsdefinitie-eml-110a-in-vis)
2. De beheerder leest de kandidatenlijsten (EML 230b) in.
3. [De beheerder leest het bestand met stembureaus en aantal kiesgerechtigden (EML 110b) in.](#de-beheerder-leest-het-bestand-met-stembureaus-en-aantal-kiesgerechtigden-eml-110b-in-vis)
4. De beheerder selecteert het type stemopneming.
5. De beheerder bevestigt het aantal kiesgerechtigden in de gemeente.
6. De applicatie maakt de verkiezing GSB, de verkiezing CSB, en het GSB als stembureau voor het CSB aan.

__Uitbreidingen:__
2a. De applicatie geeft een foutmelding bij het inlezen van de kandidatenlijsten:

3a. De beheerder slaat het invoeren van stembureaus over:  
&emsp; 3a1. (tijdens stap 5) De beheerder voert het aantal kiesgerechtigden in de gemeente handmatig in.  
&emsp; 3a2. (na inrichten applicatie) [De beheerder of coördinator zet de stembureaus in de applicatie.](#de-beheerder-of-coördinator-zet-de-stembureaus-in-de-applicatie-zee)

5b. Het aantal kiesgerechtigden stond niet in het EML-bestand met stembureaus:  
&emsp; 5b1. De beheerder voert het aantal kiesgerechtigden handmatig in.

### Niet in scope

- Inlezen totalenlijst (kandidatenlijsten met adresgegevens). Deze gegevens zijn relevant voor de benoemingsbrieven en de kennisgevingen tot geloofsbrief.


## De beheerder leest de verkiezingsdefinitie (EML 110a) in (vis)

__Niveau:__ subfunctie, vis, 🐟

__Hoofscenario:__
1. De beheerder leest de verkiezingsdefinitie (EML 110a) in.
2. De beheerder stelt vast dat de hash van de verkiezingsdefinitie klopt.

__Uitbreidingen:__  
1a. De applicatie geeft een foutmelding bij het inlezen van de verkiezingsdefinitie:

2a. De hash van de verkiezingsdefinitie klopt niet:


## De beheerder leest het bestand met stembureaus en aantal kiesgerechtigden (EML 110b) in (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__
1. De beheerder importeert het bestand met de stembureaus en het aantal kiesgerechtigden op gemeenteniveau (EML 110b).
2. De applicatie stelt vast dat het bestand aan de validatieregels voldoet.
3. De beheerder stelt vast dat de stembureaus in de applicatie kloppen met de door de gemeente vooraf gepubliceerde lijst.

__Uitbreidingen:__  
2a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus:

3a. De stembureaus in de applicatie komen niet overeen met de vooraf gepubliceerde lijst:  
&emsp; 3a1. De beheerder past de stembureaus aan.

## De beheerder of coördinator zet de stembureaus in de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De stembureaus zijn niet tijdens [het inrichten van de applicatie](#de-beheerder-richt-de-applicatie-in-voor-gsb-enof-csb-wolk) ingevoerd.
- De invoerfase van de zitting is nog niet gestart. Na het starten van de invoerfase kan alleen de [coördinator nog wijzigingen in de lijst met stembureaus aanbrengen](./gsb-eerste-zitting.md#de-coördinator-gsb-bewerkt-de-stembureaus-tijdens-de-eerste-zitting-zee).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder importeert het bestand met de stembureaus en het aantal kiesgerechtigden op gemeenteniveau.
2. De applicatie stelt vast dat het bestand aan de validatieregels voldoet.
3. De applicatie negeert het aantal kiesgerechtigden in het bestand.
4. De beheerder stelt vast dat de stembureaus in de applicatie kloppen met de door de gemeente vooraf gepubliceerde lijst.

__Uitbreidingen:__  

1a. Er is geen te importeren bestand met stembureaus:  
&emsp; 1a1. De beheerder of coördinator voert de stembureaus handmatig in.

2a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus:

4a. De stembureaus in de applicatie komen niet overeen met de vooraf gepubliceerde lijst:  
&emsp; 4a1. De beheerder of coördinator past de stembureaus aan.

## De beheerder exporteert de stembureaus (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario__:

1. De beheerder exporteert de stembureaus.
2. De beheerder slaat de geëxporteerde stembureaus op, zodat ze geïmporteerd kunnen worden bij een volgende verkiezing.

## De beheerder maakt de gebruikers aan (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder maakt beheerders aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
2. De beheerder maakt coördinatoren aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
3. De beheerder maakt invoerders aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
4. De beheerder controleert de lijst met gebruikers en stelt vast dat alle gebruikers goed zijn.

__Uitbreidingen:__

3a. De beheerder heeft de volledige naam niet van de invoerder die nog toegevoegd moet worden:  
&emsp; 3a1. De beheerder maakt een invoerder aan met een gebruikersnaam en tijdelijk wachtwoord, 
  maar zonder volledige naam.  

4a. De lijst met gebruikers moet aangepast worden:  
&emsp; 4a1. De beheerder past de volledige naam aan van een gebruiker.  
&emsp; 4a2. De beheerder stelt een nieuw tijdelijk wachtwoord in voor een gebruiker.  
&emsp; 4a3. De beheerder verwijdert een gebruiker.
