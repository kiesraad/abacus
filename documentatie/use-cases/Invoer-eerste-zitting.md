# Invoer eerste zitting

## Het GSB voert de PV's en eventuele SB corrigenda's (DSO) in de applicatie in

__niveau:__ hoog-over, vlieger, 🪁

__precondities:__

- [De beheerder en de coördinator richten de applicatie in](./Installatie-en-inrichting-applicatie.md#de-beheerder-en-de-coördinator-richten-de-applicatie-in)

### Hoofdscenario en uitbreidingen

__trigger:__ Het geplande tijdstip om invoer te starten breekt aan.

__hoofdscenario__:  

1. De coördinator stelt invoer open.
2. (voor elk SB PV evt. met corrigendum) [De invoerders vullen de resultaten van de tellingen in.](#de-invoerders-vullen-de-resultaten-van-de-tellingen-in)
3. De coördinator sluit de invoer af.
4. De applicatie stelt vast dat voor alle stembureaus resultaten zijn ingevoerd.
5. De applicatie stelt vast dat er geen stembureaus met (geaccepteerde) waarschuwingen zijn.
6. De applicatie genereert de PVs en EMLs etc.

__uitbreidingen__:  
4a. De applicatie stelt vast dat niet voor niet alle stembureaus resultaten zijn ingevoerd:

5a. De applicatie stelt vast dat er stembureaus met waarschuwingen zijn:

### Open punten

- Moet de applicatie een preview van het gegenereerde PV tonen, zodat de coördinator die kan controleren?


## De invoerders vullen de resultaten van de tellingen in

__niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__trigger:__ De coördinator ontvangt een SB PV evt. met corrigendum.

__hoofdscenario__:

1. De coördinator geeft het SB PV evt. met corrigendum aan de eerste invoerder.
2. [De eerste invoerder voert de resultaten van de telling in.](#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in)
3. De coördinator geeft het SB PV evt. met corrigendum aan de tweede invoerder.
4. [De tweede invoerder voert de resultaten van de telling in.](#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in)
5. (na eerste en/of tweede invoer) De applicatie stelt vast dat de invoer geen (geaccepteerde) waarschuwingen bevat.
6. De applicatie stelt vast dat beide invoeren gelijk zijn.
7. De applicatie slaat het definitieve resultaat van het stembureau op.

__uitbreidingen__:  
5a. De applicatie stelt vast dat een invoerder waarschuwingen heeft geaccepteerd:  
&emsp; 5a1. De coördinator beoordeelt de geaccepteerde waarschuwingen.

6a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 6a1. [De coördinator lost de verschillen tussen de twee invoeren op.](#de-coördinator-lost-de-verschillen-tussen-de-twee-invoeren-op)


---


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
   de [validatieregels voor fouten](./Validatieregels-plausibiliteitschecks-tellingen.md#validatieregels-geven-fouten)
5. (tijdens invoer) De applicatie stelt vast dat de invoer voldoet aan
   de [plausibiliteitschecks](./Validatieregels-plausibiliteitschecks-tellingen.md#plausibiliteitschecks-geven-waarschuwingen).
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
&emsp; 4a2. [De invoerder handelt de fout(en) af.](#de-invoerder-handelt-de-fouten-af)  

5a. De invoer voldoet niet aan de plausibiliteitschecks:  
&emsp; 5a1. De applicatie toont een waarschuwing voor elke gefaalde plausibiliteitscheck.  
&emsp;
5a2. [De invoerder handelt de waarschuwing(en) af.](#de-invoerder-handelt-de-waarschuwingen-af)

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


---


## De invoerder handelt de fout(en) af

__niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__trigger:__ De controles geven een foutmelding vanwege de [validatieregels voor fouten](./Validatieregels-plausibiliteitschecks-tellingen.md#validatieregels-geven-fouten).

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

__trigger:__ De controles geven een waarschuwing vanwege de [plausibiliteitschecks](./Validatieregels-plausibiliteitschecks-tellingen.md#plausibiliteitschecks-geven-waarschuwingen).

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
