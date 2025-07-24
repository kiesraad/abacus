# Beheerder

## De beheerder richt de applicatie in voor GSB en/of CSB (wolk)

_Niveau:_ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

1. [De beheerder installeert de applicatie.](#de-beheerder-installeert-de-applicatie-zee)
2. [De beheerder zet de verkiezingen in de applicatie.](#de-beheerder-zet-de-verkiezingen-in-de-applicatie-zee)
3. De beheerder leest de kandidatenlijst in.
4. [De beheerder zet de stembureaus in de applicatie.](#de-beheerder-zet-de-stembureaus-in-de-applicatie-zee)
5. [De beheerder maakt de gebruikers aan.](#de-beheerder-maakt-de-gebruikers-aan-zee)

__Uitbreidingen:__  

3a. De applicatie geeft een foutmelding bij het inlezen van de kandidatenlijst:

### Niet in scope

- Inlezen totalenlijst (kandidatenlijst met adresgegevens). Deze gegevens zijn relevant voor de benoemingsbrieven en de kennisgevingen tot geloofsbrief.

## De beheerder installeert de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Trigger:__ De Kiesraad maakt de applicatie beschikbaar.

__Hoofdscenario:__

1. De beheerder bereidt één computer als Abacus-server voor.
2. De beheerder downloadt de applicatie.
3. De beheerder plaatst de applicatie op de server.
4. De beheerder start de applicatie.
5. De beheerder maakt een eerste account en wachtwoord aan.
6. (voor elk invoerstation) De beheerder bereidt de computer als invoerstation voor.
7. (voor elk invoerstation) De beheerder zorgt dat het invoerstation met de server kan verbinden.

__Uitbreidingen:__  
1a. De beheerder bereidt één of meerdere reserve-servers voor:

4a. De installatie van de applicatie geeft een foutmelding:

## De beheerder zet de verkiezingen in de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. De beheerder leest de verkiezingsdefinitie in.
2. De beheerder stelt vast dat de hash van de verkiezingsdefinitie klopt.
3. De applicatie maakt op basis van de verkiezingsdefinitie de verkiezing GSB, de verkiezing CSB, en het GSB als stembureau voor het CSB aan.

__Uitbreidingen:__  
1a. De applicatie geeft een foutmelding bij het inlezen van de verkiezingsdefinitie:

2a. De hash van de verkiezingsdefinitie klopt niet.

## De beheerder of coördinator zet de stembureaus in de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De lijst met gepubliceerde stembureaus is beschikbaar.
- De invoerfase van de zitting is nog niet gestart. Na het starten van de invoerfase kan alleen de [coördinator nog wijzigingen in de lijst met stembureaus aanbrengen](./gsb-eerste-zitting.md#de-coördinator-gsb-bewerkt-de-stembureaus-tijdens-de-eerste-of-nieuwe-zitting-zee).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder selecteert de verkiezing.
2. De beheerder importeert het EML_NL-bestand met de stembureaus.
3. De applicatie stelt vast dat de stembureaus aan de validatieregels voldoen.
4. De beheerder stelt vast dat de stembureaus in de applicatie kloppen met de door de gemeente vooraf gepubliceerde lijst.

__Uitbreidingen:__  

1a. De beheerder selecteert een andere verkiezing dan van het EML_NL-bestand en de lijst met gepubliceerde stembureaus:

2a. Er is geen te importeren bestand met stembureaus:  
&emsp; 2a1. De beheerder voert de stembureaus handmatig in.

3a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus.

4a. De lijst met stembureaus moet aangepast worden:  
&emsp; 4a1. De beheerder past de stembureaus aan.

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

3a. De beheerder heeft de volledige naam niet voor een toe te voegen invoerder:  
&emsp; 3a1. De beheerder maakt een invoerder aan met een gebruikersnaam en tijdelijk wachtwoord, 
  maar zonder volledige naam.  

4a. De lijst met gebruikers moet aangepast worden:  
&emsp; 4a1. De beheerder past de volledige naam aan van een gebruiker.  
&emsp; 4a2. De beheerder stelt een nieuw tijdelijk wachtwoord in voor een gebruiker.  
&emsp; 4a3. De beheerder verwijdert een gebruiker.
