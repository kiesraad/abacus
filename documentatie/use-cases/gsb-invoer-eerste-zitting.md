# GSB: Invoer eerste zitting

## De coördinator GSB en de invoerders voeren alle gegevens in de applicatie in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__ 
1. De coördinator GSB stelt de invoer open.
2. (voor elk stembureau) [De invoerders vullen de resultaten van de tellingen in.](#de-invoerders-vullen-de-resultaten-van-de-tellingen-in-vlieger)
3. (parallel aan invoer stembureaus) [De coördinator GSB voert details zitting, bezwaren, bijzonderheden, etc. van de GSB-zitting in.](#de-coördinator-gsb-voert-details-zitting-bezwaren-bijzonderheden-etc-van-de-gsb-zitting-in-zee)
4. De coördinator GSB sluit de invoer.
5. De applicatie stelt vast dat voor alle stembureaus resultaten zijn ingevoerd.
6. De applicatie stelt vast dat er geen stembureaus met waarschuwingen zijn.

__Uitbreidingen:__  
2a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

2b. (CSO) Er moeten hertellingen uitgevoerd worden vanwege foutmeldingen en/of waarschuwingen:  
&emsp; 2b1. Het GSB voert de hertelling uit.  
&emsp; 2b2. Het GSB corrigeert de Na 31-2 Bijlage 1 of vult een nieuwe Na 31-2 Bijlage 1 in.  
&emsp; 2b3. Het GSB voert de gecorrigeerde/nieuwe Na 31-2 Bijlage 1 in de applicatie in.  
&emsp; 2b4. Het GSB vermeldt het stembureau bij "extra onderzoeken van het GSB" in het PV.

2-3a. Tijdens invoer is er reden om de invoer (tijdelijk) te stoppen:  
&emsp; 2-3a1. De coördinator GSB pauzeert de invoer.  
&emsp; 2-3a2. De applicatie blokkeert verdere invoer.

2-3b. Nadat een stembureau twee keer is ingevoerd, wordt de telling van dat stembureau gecorrigeerd:  
&emsp; 2-3b1. De coördinator GSB verwijdert de invoer van het stembureau.  
&emsp; 2-3b2. De coördinator GSB laat het stembureau twee keer invoeren.  

5a. De applicatie stelt vast dat niet voor alle stembureaus resultaten zijn ingevoerd:

6a. De applicatie stelt vast dat er stembureaus met geaccepteerde waarschuwingen zijn:

### Niet in scope
- Verschillende fases in de applicatie, zoals inrichten, invoer, voorbereiden PV. Reden hiervoor is dat we de coördinator GSB niet willen beperken in wat deze wanneer kan doen. We zouden fases kunnen implementeren waartussen de coördinator GSB vrij kan bewegen, maar dan is het gebruiksvriendelijker om bij bepaalde acties een waarschuwing te laten zien. De coördinator GSB heeft wel de mogelijkheid om invoer open te zetten en te stoppen. Eventueel ook om invoer te pauzeren.

### Open punten

- Welke controles willen we nog nadat de invoer is afgesloten? Of zijn die controles onderdeel van het afsluiten?
- Hoe ziet het stoppen/blokkeren van invoer er precies uit?
- CSO: invoerders vullen gegevens van Bijlage 1 in. DSO: invoerders vullen gegevens van N 10-1 en evt. Na 14-1 in. => input-/output-bestanden?


## De coördinator GSB voert details zitting, bezwaren, bijzonderheden, etc. van de GSB-zitting in. (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De coördinator GSB is ingelogd in de applicatie.

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De coördinator GSB voert de datum, tijd en locatie van de zitting in.
2. De coördinator GSB voert de aanwezige leden van het GSB in.
3. De coördinator GSB voert de bezwaren van kiezers/belangstellenden tijdens de zitting in.
4. De coördinator GSB voert onregelmatigheden of bijzonderheden tijdens de zitting in.

__Uitbreidingen:__

3a. De coördinator GSB vult in: "zie bijlage".

4a. De coördinator GSB vult in: "zie bijlage".

### Open punten

- Voert de coördinator GSB de sectie "Nieuwe telling aantal toegelaten kiezers bij onverklaarde telverschillen" in? Of doet de applicatie dat?
  - Nieuw model GSB PV heeft drie vinkjes: toegelaten kiezers opnieuw vastgesteld, onderzocht vanwege andere redenen, stembiljetten (deels) herteld.
  - De SB PVs verschillen hierin tussen DSO en CSO.
  - Als de applicatie dit moet doen, moeten de invoerders dit over kunnen nemen van het SB PV.
  - De applicatie gaat nog uit van de oude modellen, met alleen de vraag "Is er herteld?"


## De invoerders vullen de resultaten van de tellingen in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Trigger:__ De coördinator GSB ontvangt een SB PV evt. met corrigendum.

__Hoofdscenario:__

1. De coördinator GSB geeft het SB PV (eventueel met corrigendum) aan de eerste invoerder.
2. (tijdens invoer) De coördinator GSB monitort de voortgang op het statusoverzicht van de steminvoer.
3. [De eerste invoerder voert de resultaten van de telling in.](#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in-zee)
4. De coördinator GSB geeft het SB PV evt. met corrigendum aan de tweede invoerder.
5. [De tweede invoerder voert de resultaten van de telling in.](#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in-zee)
6. (na eerste en/of tweede invoer) De applicatie stelt vast dat de invoer geen waarschuwingen bevat.
7. De applicatie stelt vast dat beide invoeren gelijk zijn.
8. De applicatie slaat het definitieve resultaat van het stembureau op.

__Uitbreidingen:__  
6a. De applicatie stelt vast dat een invoerder waarschuwingen heeft geaccepteerd:  
&emsp; 6a1. De coördinator GSB beoordeelt de geaccepteerde waarschuwingen.

7a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 7a1. [De coördinator GSB beoordeelt de verschillen tussen de twee invoeren.](#de-coördinator-gsb-beoordeelt-de-verschillen-tussen-de-twee-invoeren-zee)

### Open punten
- Waar in het scenario kan de coördinator GSB verklaringen maken over de waarschuwingen, zodat het CSB deze beter kan beoordelen? Na de eerste of tweede invoer? Of pas nadat het resultaat van een stembureau definitief is?



## De eerste of tweede invoerder voert de resultaten van de telling in (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De invoerder is ingelogd in de applicatie.

### Hoofdscenario en uitbreidingen

__Trigger:__ De coördinator GSB geeft het SB PV en eventueel SB corrigendum PV aan de invoerder.

__Hoofdscenario:__

1. De invoerder selecteert het stembureau van het PV in de applicatie.
2. De applicatie stelt vast dat er geen eerdere invoer voor het stembureau is opgeslagen.
3. De invoerder voert in of er herteld is.
4. De invoerder vult de resultaten van de telling in.
5. (tijdens invoer) De applicatie stelt vast dat de invoer voldoet aan
   de [validatieregels voor fouten](./validatieregels-plausibiliteitschecks-tellingen.md#validatieregels-geven-fouten)
6. (tijdens invoer) De applicatie stelt vast dat de invoer voldoet aan
   de [plausibiliteitschecks](./validatieregels-plausibiliteitschecks-tellingen.md#plausibiliteitschecks-geven-waarschuwingen).
7. De invoerder bevestigt in de applicatie klaar te zijn met de invoer van het stembureau.

__Uitbreidingen:__  
1a. De invoerder kan het stembureau op het PV niet in de applicatie vinden:  
&emsp; 1a1. De invoerder verwittigt de coördinator GSB.  
&emsp; 1a2. De coördinator GSB en de invoerder vinden alsnog het stembureau.  
&emsp; &emsp; 1a2a. Het stembureau is niet aanwezig in de applicatie:  
&emsp; &emsp; &emsp; 1a2a1. De coördinator GSB voegt het stembureau toe in de applicatie.  
1b. De tweede invoerder heeft ook de eerste invoer gedaan:  
1c. De invoerder selecteert een ander stembureau dan op het PV staat:  
1d. De invoerder selecteert een stembureau waar iemand anders mee bezig is:  
1e. De invoerder selecteert een stembureau waar een andere gebruiker invoer voor heeft opgeslagen:  
1f. De invoerder selecteert een stembureau waarvan de invoer al definitief is:  
&emsp; 1f1. De applicatie toont een foutmelding.

2a. De applicatie stelt vast dat de invoerder eerdere invoer voor het stembureau heeft opgeslagen:  
&emsp; 2a1. De applicatie laadt de eerder ingevoerde data.

5a. De invoer voldoet niet aan de validatieregels voor fouten:  
&emsp; 5a1. De applicatie toont een foutmelding voor elke gefaalde validatieregel.  
&emsp; 5a2. [De invoerder handelt de fout(en) af.](#de-invoerder-handelt-de-fouten-af-vis)  

6a. De invoer voldoet niet aan de plausibiliteitschecks:  
&emsp; 6a1. De applicatie toont een waarschuwing voor elke gefaalde plausibiliteitscheck.  
&emsp; 6a2. [De invoerder handelt de waarschuwing(en) af.](#de-invoerder-handelt-de-waarschuwingen-af-vis)

7a. De invoerder breekt de invoer af en bewaart de invoer:  
&emsp; 7a1. De applicatie slaat de invoer op, gekoppeld aan de invoerder.  
&emsp; 7a2. De applicatie laadt de pagina voor het selecteren van een stembureau.  
7b. De invoerder breekt de invoer af en bewaart de invoer niet:  
&emsp; 7b1. De applicatie verwijdert de invoer voor het stembureau.  
&emsp; 7b2. De applicatie laadt de pagina voor het selecteren van een stembureau.

### Open punten
- De use case beschrijft de oude modellen, met daarin alleen de vraag "Is er herteld?" In de nieuwe modellen zijn er drie vragen.


## De coördinator GSB beoordeelt de verschillen tussen de twee invoeren (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Trigger:__ De applicatie stelt vast dat beide invoeren niet gelijk zijn.

__Hoofdscenario:__

1. De coördinator GSB bekijkt de verschillen tussen de twee invoeren.
2. De coördinator GSB stelt vast dat één van de twee invoeren correct is.
3. De coördinator GSB accepteert de correcte invoer en gooit de andere invoer weg.
4. De applicatie behandelt de geaccepteerde invoer als een eerste invoer. (Dus bij nieuwe invoer: waarschuwingen over verschillen met geaccepteerde invoer.)
4. De coördinator GSB geeft het PV aan een invoerder om nogmaals in te voeren.

__Uitbreidingen:__  
2a. Geen van beide invoeren is correct:  
&emsp; 2a1. De coördinator GSB verwijdert beide invoeren.  
&emsp; 2a2. De coördinator GSB laat het stembureau opnieuw invoeren door twee invoerders.

### Niet in scope

- Gebruiksvriendelijker alternatief is om afhankelijk van het aantal verschillen drie opties te geven: (1) coördinator GSB kiest één invoer en voegt een verklaring toe aan "Bijzonderheden"; (2) coördinator GSB laat alleen de afwijkende lijst(en) opnieuw invoeren; (3) coördinator GSB laat de volledige invoer opnieuw doen.



## De invoerder handelt de fout(en) af (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Trigger:__ De controles geven een foutmelding vanwege de [validatieregels voor fouten](./validatieregels-plausibiliteitschecks-tellingen.md#validatieregels-geven-fouten).

*Foutmelding*: De ingevoerde waardes kunnen niet correct zijn. Bijvoorbeeld: het totaal van de stemmen op een lijst komt niet overeen met de som van de stemmen van de kandidaten op die lijst.

__Hoofdscenario:__  
Voor elke foutmelding:  

1. De invoerder controleert de foutmelding.
2. De invoerder constateert dat hij/zij een fout heeft gemaakt in de invoer.
3. De invoerder corrigeert de fout in de invoer.

__Uitbreidingen:__  
2a. De invoerder stelt een fout op het PV vast en kan de foutmelding niet oplossen:  
&emsp; 2a1. De invoerder meldt de fout op het PV bij de coördinator GSB.  
&emsp; 2a2. De coördinator GSB stuurt het PV terug in het proces.  
&emsp; 2a3. De invoerder breekt de invoer af.  
&emsp; 2a4. De applicatie verwijdert de ingevoerde data.  

### Open punten

- Moet de coördinator GSB de optie hebben om ondanks een foutmelding de invoerder het hele PV in te laten voeren, zodat een complete lijst met alle fouten kan worden gemaakt? Die lijst moet dan geprint kunnen worden, zodat die meekan met het PV.
- Als de coördinator GSB het PV terugstuurt in het proces, naar welk punt dan precies?



## De invoerder handelt de waarschuwing(en) af (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Trigger:__ De controles geven een waarschuwing vanwege de [plausibiliteitschecks](./validatieregels-plausibiliteitschecks-tellingen.md#plausibiliteitschecks-geven-waarschuwingen).

*Waarschuwing*: De ingevoerde waardes zijn mogelijk niet correct. Bijvoorbeeld: er is een groot aantal blanco stemmen of de tweede invoer klopt niet met de eerste invoer.

__Hoofdscenario:__  
Voor elke waarschuwing:  

1. De invoerder controleert de waarschuwing.
2. De invoerder constateert dat de invoer klopt met het PV.
3. De invoerder accepteert de waarschuwing in de applicatie.

__Uitbreidingen:__  
2a. De invoerder constateert dat hij/zij een fout heeft gemaakt in de invoer.  
&emsp; 2a1. De invoerder corrigeert de fout in de invoer.  

### Open punten

- De eerste stap van invoer is aangeven of er herteld is vanwege een verschil tussen aantal toegelaten kiezers en aantal uitgebrachte stemmen. Hoe verhoudt de invoer van die stap zich tot het oplossen van waarschuwingen over aantallen toegelaten kiezers en uitgebrachte stemmen?
- Als de coördinator GSB het PV terugstuurt in het proces, naar welk punt dan precies?
