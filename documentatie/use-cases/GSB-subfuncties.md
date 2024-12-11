# Use cases GSB - subfunctie,  vis 🐟

## De invoerder handelt de fout(en) af

__niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__trigger:__ De controles geven een foutmelding vanwege de [validatieregels voor fouten](./GSB-validatieregels-plausibiliteitschecks.md#validatieregels-geven-fouten).

*Foutmelding*: De ingevoerde waardes kunnen niet correct zijn. Bijvoorbeeld: het totaal van de stemmen op een lijst komt niet overeen met de som van de stemmen van de kandidaten op die lijst.

__hoofdscenario__:  
Voor elke foutmelding:  

1. De invoerder controleert de foutmelding.
2. De invoerder constateert dat hij/zij een fout heeft gemaakt in de invoer.
3. De invoerder corrigeert de fout in de invoer.

__uitbreidingen__:  
2a. De invoerder stelt een fout op het PV vast en kan de foutmelding niet oplossen:  
&emsp; 2a1. De invoerder meldt de fout op het PV bij de coördinator.  
&emsp; 2a2. De coördinator stuurt het PV terug in het proces.  
&emsp; 2a3. De invoerder breekt de invoer af.  
&emsp; 2a4. De applicatie verwijdert de ingevoerde data.  

### Open punten

- Als de coördinator het PV terugstuurt in het proces, naar welk punt dan precies?

## De invoerder handelt de waarschuwing(en) af

__niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__trigger:__ De controles geven een waarschuwing vanwege de [plausibiliteitschecks](./GSB-validatieregels-plausibiliteitschecks.md#plausibiliteitschecks-geven-waarschuwingen).

*Waarschuwing*: De ingevoerde waardes zijn mogelijk niet correct. Bijvoorbeeld: er is een groot aantal blanco stemmen of de tweede invoer klopt niet met de eerste invoer.

__hoofdscenario__:  
Voor elke waarschuwing:  

1. De invoerder controleert de waarschuwing.
2. De invoerder constateert dat de invoer klopt met het PV.
3. De invoerder accepteert de waarschuwing in de applicatie.

__uitbreidingen__:  
2a. De invoerder constateert dat hij/zij een fout heeft gemaakt in de invoer.  
&emsp; 2a1. De invoerder corrigeert de fout in de invoer.  

### Open punten

- De eerste stap van invoer is aangeven of er herteld is vanwege een verschil tussen aantal toegelaten kiezers en aantal uitgebrachte stemmen. Hoe verhoudt de invoer van die stap zich tot het oplossen van waarschuwingen over aantallen toegelaten kiezers en uitgebrachte stemmen?
- Als de coördinator het PV terugstuurt in het proces, naar welk punt dan precies?


## De coördinator bewerkt de stembureaus

__niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__hoofdscenario__:

1. De coördinator voegt stembureaus toe, past stembureaus aan en verwijdert stembureaus waar nodig.
2. De applicatie stelt vast dat de bewerking aan de validaties voldoet.

__uitbreidingen__:
2a. (bij verwijderen) Er is al invoer of een resultaat voor het stembureau:
&emsp; 2a1. De applicatie geeft aan dat het stembureau niet verwijderd kan worden.

