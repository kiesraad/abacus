# Installatie en inrichting van de applicatie

## De beheerder en de coördinator richten de applicatie in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

__Precondities:__

- Het GSB heeft de kandidatenlijst beschikbaar gemaakt.
- De Kiesraad heeft de verkiezingsdefinitie beschikbaar gemaakt.

### Hoofdscenario en uitbreidingen

__Trigger:__

1. [De beheerder installeert de applicatie.](#de-beheerder-installeert-de-applicatie-zee)
2. De beheerder leest de verkiezingsdefinitie in.
3. De coördinator leest de kandidatenlijst in.
4. [De coördinator coördinator zet de stembureaus in de applicatie.](#de-coördinator-zet-de-stembureaus-in-de-applicatie-zee)
5. De beheerder maakt de gebruikers aan.

__Uitbreidingen:__  
1a. De applicatie geeft een foutmelding bij het inlezen van de verkiezingsdefinitie:

2a. De applicatie geeft een foutmelding bij het inlezen van de kandidatenlijst:


## De beheerder installeert de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Trigger:__ De Kiesraad maakt de applicatie beschikbaar.

__Hoofdscenario:__

1. De beheerder bereidt één server voor.
2. De beheerder installeert de applicatie.
3. (voor elke client) De beheerder bereidt de client-machine voor.
4. (voor elke client) De beheerder zorgt dat de client met de server kan verbinden.

__Uitbreidingen:__  
1a. De beheerder bereidt één of meerdere reserve-servers voor:

2a. De installatie van de applicatie geeft een foutmelding:

3a. De server en client zijn dezelfde machine:

### Open punten

- Hoe vaak wordt de server ook als client gebruikt? Bijvoorbeeld door de coördinator.
- OSV richt de server ook gelijk als client in. Willen wij dit ook?
- Afzenderverificatie ontbreekt nog, want nog geen beslissing over oplossing.


## De coördinator zet de stembureaus in de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De coördinator heeft de lijst met gepubliceerde stembureaus.
- De invoer is nog niet gestart.

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De coördinator selecteert de verkiezing.
2. De coördinator importeert het EML-NL bestand met de stembureaus.
3. De applicatie stelt vast dat de stembureaus aan de validatieregels voldoen.
4. De coördinator stelt vast dat de stembureaus in de applicatie kloppen met de door de gemeente vooraf gepubliceerde lijst.

__Uitbreidingen:__  

1a. De coördinator selecteert een andere verkiezing dan van het bestand en de lijst met stembureaus:

2a. Er is geen te importeren bestand met stembureaus:  
&emsp; 2a1. De coördinator voert de stembureaus handmatig in.

3a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus:

4a. De lijst met stembureaus moet aangepast worden:  
&emsp; 4a1. De coördinator past de stembureaus aan.

### Open punten

- Het is niet helemaal duidelijk hoe de stembureaus aangemaakt worden. Dit kan handmatig of door het importeren van een
  bestand. We weten niet hoe vaak welke van deze twee manieren of een combinatie van de twee gebruikt worden. Een
  stembureau-bestand kan door OSV geëxporteerd worden, maar er zouden ook andere tools bestaan die zo'n bestand kunnen
  genereren.
- Bij gelijktijdige verkiezingen (gemeenteraad en stadsdeel bijvoorbeeld) zou het mooi zijn om de stembureaus van één
  naar een andere verkiezing te kopiëren. Minder mooi alternatief is eerst exporteren en dan importeren.
- Zodra invoer gestart is, mag het niet mogelijk zijn om stembureaus aan te passen of te verwijderen. Verwijderen wordt nu
  afgedwongen d.m.v. foreign keys in de database. Checks voor aanpassen en checks o.b.v. van de fases van de verkiezing in de
  applicatie moeten nog uitgewerkt worden.
