# Use cases GSB - gebruikersdoel, zee 🌊

## De eerste of tweede invoerder voert de resultaten van de telling in

__niveau:__ gebruikersdoel, zee, 🌊

__precondities:__

- De invoerder is ingelogd in de applicatie.

### Hoofdscenario en uitbreidingen

__trigger:__ De coördinator geeft het SB PV en eventueel SB corrigendum PV aan de invoerder.

__hoofdscenario__:

1. De invoerder selecteert het stembureau van het PV in de applicatie.
2. De applicatie stelt vast dat er geen eerdere invoer voor het stembureau is opgeslagen.
3. De invoerder vult de resultaten van de telling in.
4. (tijdens invoer) De applicatie stelt vast dat de invoer voldoet aan
   de [validatieregels voor fouten](./GSB-validatieregels-plausibiliteitschecks.md#validatieregels-geven-fouten)
5. (tijdens invoer) De applicatie stelt vast dat de invoer voldoet aan
   de [plausibiliteitschecks](./GSB-validatieregels-plausibiliteitschecks.md#plausibiliteitschecks-geven-waarschuwingen).
6. De invoerder bevestigt in de applicatie klaar te zijn met de invoer van het stembureau.

__uitbreidingen__:  
1a. De invoerder kan het stembureau op het PV niet in de applicatie vinden:  
&emsp; 1a1. De invoerder verwittigt de coördinator.  
&emsp; 1a2. De coördinator en de invoerder vinden alsnog het stembureau.  
&emsp; &emsp; 1a2a. Het stembureau is niet aanwezig in de applicatie:  
&emsp; &emsp; &emsp; 1a2a1. De coördinator voegt het stembureau toe in de applicatie.  
1b. De tweede invoerder heeft ook de eerste invoer gedaan:  
1c. De invoerder selecteert een ander stembureau dan op het PV staat:  
1d. De invoerder selecteert een stembureau waar iemand anders mee bezig is:  
1e. De invoerder selecteert een stembureau waar een andere gebruiker invoer voor heeft opgeslagen:  
1f. De invoerder selecteert een stembureau waarvan de invoer al definitief is:  
&emsp; 1f1. De applicatie toont een foutmelding.

2a. De applicatie stelt vast dat de invoerder eerdere invoer voor het stembureau heeft opgeslagen:  
&emsp; 2a1. De applicatie laadt de eerder ingevoerde data.

4a. De invoer voldoet niet aan de validatieregels voor fouten:  
&emsp; 4a1. De applicatie toont een foutmelding voor elke gefaalde validatieregel.  
&emsp; 4a2. [De invoerder handelt de fout(en) af.](./GSB-subfuncties.md#de-invoerder-handelt-de-fouten-af)  

5a. De invoer voldoet niet aan de plausibiliteitschecks:  
&emsp; 5a1. De applicatie toont een waarschuwing voor elke gefaalde plausibiliteitscheck.  
&emsp;
5a2. [De invoerder handelt de waarschuwing(en) af.](./GSB-subfuncties.md#de-invoerder-handelt-de-waarschuwingen-af)

6a. De invoerder breekt de invoer af en bewaart de invoer:  
&emsp; 6a1. De applicatie slaat de invoer op, gekoppeld aan de invoerder.  
&emsp; 6a2. De applicatie laadt de pagina voor het selecteren van een stembureau.  
6b. De invoerder breekt de invoer af en bewaart de invoer niet:  
&emsp; 6b1. De applicatie verwijdert de invoer voor het stembureau.  
&emsp; 6b2. De applicatie laadt de pagina voor het selecteren van een stembureau.

## De coördinator lost de verschillen tussen de twee invoeren op

__niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__trigger:__ De applicatie stelt vast dat beide invoeren niet gelijk zijn.

__hoofdscenario__:

1. De coördinator bekijkt de verschillen tussen de twee invoeren.
2. De coördinator stelt vast dat één van de twee invoeren correct is.
3. De coördinator accepteert de correcte invoer.

__uitbreidingen__:  
2a. Geen van beide invoeren is correct:  
&emsp; 2a1. De coördinator verwijdert beide invoeren.  
&emsp; 2a2. De coördinator laat het stembureau opnieuw invoeren door twee invoerders.

### Open punten

- Als geen van beide invoeren correct zijn, moeten dan beide invoeren verwijderd en opnieuw ingevoerd worden? Of is er
  binnen de Kieswet / het Kiesbesluit ruimte voor andere oplossingen?

## GSB installeert de applicatie

__niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__trigger:__ De Kiesraad maakt de applicatie beschikbaar.

__hoofdscenario__:

1. De beheerder bereidt één server voor.
2. De beheerder installeert de applicatie.
3. (voor elke client) De beheerder bereidt de client-machine voor.
4. (voor elke client) De beheerder zorgt dat de client met de server kan verbinden.

__uitbreidingen__:  
1a. De beheerder bereidt één of meerdere reserve-servers voor:

2a. De installatie van de applicatie geeft een foutmelding:

3a. De server en client zijn dezelfde machine:

### Open punten

- Hoe vaak wordt de server ook als client gebruikt? Bijvoorbeeld door de coördinator.
- OSV richt de server ook gelijk als client in. Willen wij dit ook?
- Afzenderverificatie ontbreekt nog, want nog geen beslissing over oplossing.


## De coördinator maakt de stembureaus aan.

__niveau:__ gebruikersdoel, zee, 🌊

__precondities:__

- De coördinator heeft het EML-NL bestand met de stembureaus.
- De coördinator heeft de lijst met gepubliceerde stembureaus.

### Hoofdscenario en uitbreidingen

__hoofdscenario__:

1. De coördinator importeert het EML-NL bestand met de stembureaus.
2. De applicatie stelt vast dat de stembureaus aan de validaties voldoen.
3. De coördinator stelt vast dat de stembureaus in de applicatie volledig en correct zijn, door ze te vergelijken met de door de gemeente vooraf gepubliceerde lijst.

__uitbreidingen__:  

1a. Er is geen te importeren bestand met stembureaus:
&emsp; 1a1. [De coördinator voert de stembureaus handmatig in.](./GSB-subfuncties.md#de-coördinator-bewerkt-de-stembureaus)

2a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus:

3a. De lijst met stembureaus moet aangepast worden:
&emsp; 3a1. [De coördinator past de stembureaus aan.](./GSB-subfuncties.md#de-coördinator-bewerkt-de-stembureaus)


### Open punten

- Het is niet helemaal duidelijk hoe de stembureaus aangemaakt worden. Dit kan handmatig of door het importeren van een
  bestand. We weten niet hoe vaak welke van deze twee manieren of een combinatie van de twee gebruikt worden. Een
  stembureau-bestand kan door OSV geëxporteerd worden, maar er zouden ook andere tools bestaan die zo'n bestand kunnen
  genereren.
- Bij gelijktijdige verkiezingen (gemeenteraad en stadsdeel bijvoorbeeld) zou het mooi zijn om de stembureaus van één
  naar een andere verkiezing te kopiëren. Minder mooi alternatief is eerst exporteren en dan importeren.
- Bij het invoeren/beheren van stembureaus toont de applicatie een waarschuwing als het aantal kiesgerechtigden niet is
  ingevuld. De gebruiker heeft twee opties: (1) aantal kiesgerechtigden invullen, (2) aangeven dat aantal
  kiesgerechtigden bewust leeg wordt gelaten.
