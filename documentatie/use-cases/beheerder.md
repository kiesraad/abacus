# Beheerder

## De beheerder richt de applicatie in (wolk)

_Niveau:_ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

1. [De beheerder installeert de applicatie.](#de-beheerder-installeert-de-applicatie-zee)
2. [De beheerder zet de verkiezingen in de applicatie.](#de-beheerder-zet-de-verkiezingen-in-de-applicatie-zee)
3. De beheerder leest de kandidatenlijst in.
4. [De beheerder zet de stembureaus in de applicatie.](#de-beheerder-zet-de-stembureaus-in-de-applicatie-zee)
5. De beheerder maakt de gebruikers aan.

__Uitbreidingen:__  

3a. De applicatie geeft een foutmelding bij het inlezen van de kandidatenlijst:

### Niet in scope

- Inlezen totalenlijst (kandidatenlijst met adresgegevens). Deze gegevens zijn relevant voor de benoemingsbrieven en de kennisgevingen tot geloofsbrief.

### Open punten
- Hoe precies krijgt de beheerder de beschikking over de verkiezingsdefinitie (met hash-code) en de kandidatenlijst (met hash-code)?
  - Zowel de verkiezingsdefinitie als de kandidatenlijst worden door het CSB aangemaakt met OSV KS.


## De beheerder installeert de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Trigger:__ De Kiesraad maakt de applicatie beschikbaar.

__Hoofdscenario:__

1. De beheerder bereidt één computer als Abacus-server voor.
2. De beheerder downloadt de applicatie.
3. De beheerder installeert de applicatie.
4. (voor elk invoerstation) De beheerder bereidt de computer als invoerstation voor.
5. (voor elk invoerstation) De beheerder zorgt dat het invoerstation met de server kan verbinden.

__Uitbreidingen:__  
1a. De beheerder bereidt één of meerdere reserve-servers voor:

3a. De installatie van de applicatie geeft een foutmelding:

4a. De server en het invoerstation zijn dezelfde machine:

### Open punten

- Het is te verwachten dat de server ook als client gebruikt wordt door de coördinator.
- Downloaden van een sleutel o.i.d. voor afzenderverificatie ontbreekt nog, want nog geen beslissing over oplossing.


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

### Open punten
- Verder uitwerken hoe GSB en CSB apart aangemaakt worden.


## De beheerder zet de stembureaus in de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De lijst met gepubliceerde stembureaus is beschikbaar.
- De invoer is nog niet gestart.

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

3a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus:

4a. De lijst met stembureaus moet aangepast worden:  
&emsp; 4a1. De beheerder past de stembureaus aan.

### Open punten

- Zijn er gemeentes waar de Coördinator GSB de stembureaus aan gaat maken?
- Het is niet helemaal duidelijk hoe de stembureaus aangemaakt worden. Dit kan handmatig of door het importeren van een
  bestand. We weten niet hoe vaak welke van deze twee manieren of een combinatie van de twee gebruikt worden. Een
  stembureau-bestand kan door OSV geëxporteerd worden, maar er zouden ook andere tools bestaan die zo'n bestand kunnen
  genereren.
- Bij gelijktijdige verkiezingen (gemeenteraad en stadsdeel bijvoorbeeld) zou het mooi zijn om de stembureaus van één
  naar een andere verkiezing te kopiëren. Minder mooi alternatief is eerst exporteren en dan importeren.
- Zodra invoer gestart is, mag het niet mogelijk zijn om stembureaus aan te passen of te verwijderen. Verwijderen wordt nu
  afgedwongen d.m.v. foreign keys in de database. Checks voor aanpassen en checks o.b.v. de fases van de verkiezing in de
  applicatie moeten nog uitgewerkt worden.


## De beheerder exporteert de stembureaus (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario__:

1. De beheerder exporteert de stembureaus.
2. De beheerder slaat de geëxporteerde stembureaus op, zodat ze geïmporteerd kunnen worden bij een volgende verkiezing.

### Open punten

- Is dit eigenlijk de use case voor het opschonen van de gebruikte machines?
