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

2c. (DSO) Er zijn controles op de telresultaten van het stembureau uitgevoerd:  
&emsp; 2c1. Het GSB vult het inlegvel in.  
&emsp; 2c2. Het GSB voegt het inlegvel toe aan het proces-verbaal.  

2-3a. Tijdens invoer is er reden om de invoer (tijdelijk) te stoppen:  
&emsp; 2-3a1. De coördinator GSB pauzeert de invoer.  
&emsp; 2-3a2. De applicatie blokkeert verdere invoer.

2-3b. De telling van het stembureau moet worden gecorrigeerd nadat deze al twee keer was ingevoerd:  
&emsp; 2-3b1. De coördinator GSB verwijdert de invoer van het stembureau.  
&emsp; 2-3b2. De coördinator GSB laat het stembureau twee keer invoeren.  

5a. De applicatie stelt vast dat niet voor alle stembureaus resultaten zijn ingevoerd:

6a. De applicatie stelt vast dat er stembureaus met geaccepteerde waarschuwingen zijn:


### Open punten

- Komt het inlegvel uit Abacus of is het onderdeel van de toolkit? (N10-1 wordt als typst template gemaakt dus het kan) -> kan beide, afhankelijk van het proces en de mogelijkheden van de gemeente
- Hoe ziet het stoppen/blokkeren van invoer er precies uit?
- CSO: invoerders vullen gegevens van Bijlage 1 in. DSO: invoerders vullen gegevens van N 10-1 en evt. Na 14-1 in. => input-/output-bestanden?


### Niet in scope

- Controles op gemeenteniveau nadat alle stembureaus zijn ingevoerd:
  - Controle "mogelijke omwissel van kandidaatstemmen"
  - Controle "verschilpercentage van 50% of hoger"


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

- Voert de coördinator GSB de sectie "Nieuwe telling aantal toegelaten kiezers bij onverklaarde telverschillen" in? Of doet de applicatie dat? => op welk PV staat deze sectie?  
  -> Na 14-1 Pv corrigendum SB DSO versie 1 / bijlage 1 (per SB) bij Na 31-2 Pv GSB CSO  
  sectie 1.1 voor de vraag en 2.1 voor nieuwe aantallen (DSO)  
  sectie 2.1 voor de vraag en 3.1 voor nieuwe aantallen (CSO)  

## De invoerders vullen de resultaten van de tellingen in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Trigger:__ De coördinator GSB ontvangt een SB PV evt. met corrigendum.

__Hoofdscenario:__

1. De coördinator GSB geeft het SB PV (eventueel met corrigendum en/of inlegvel) aan de eerste invoerder.
2. (tijdens invoer) De coördinator GSB monitort de voortgang op het statusoverzicht van de steminvoer.
3. [De eerste invoerder voert de resultaten van de telling in.](#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in-zee)
4. De applicatie stelt vast dat de eerste invoer geen geaccepteerde fouten bevat.
5. De applicatie stelt vast dat de eerste invoer geen geaccepteerde waarschuwingen bevat.
6. De coördinator GSB geeft het SB PV (evt. met corrigendum en/of inlegvel) aan de tweede invoerder.
7. [De tweede invoerder voert de resultaten van de telling in.](#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in-zee)
8. De applicatie stelt vast dat beide invoeren gelijk zijn.
9. De applicatie stelt vast dat de tweede invoer geen geaccepteerde waarschuwingen bevat.
10. De applicatie slaat het definitieve resultaat van het stembureau op.

__Uitbreidingen:__  
4a. De applicatie stelt vast dat een invoerder fouten heeft geaccepteerd:  
&emsp; 4a1. [De coördinator GSB beoordeelt de geaccepteerde fouten.](#de-coördinator-gsb-beoordeelt-de-geaccepteerde-fouten-zee)

5a. De applicatie stelt vast dat een invoerder waarschuwingen heeft geaccepteerd:  
&emsp; 5a1. De coördinator GSB beoordeelt de geaccepteerde waarschuwingen.

8a. De applicatie stelt vast dat een invoerder waarschuwingen heeft geaccepteerd:  
&emsp; 8a1. De coördinator GSB beoordeelt de geaccepteerde waarschuwingen.

8a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 8a1. [De coördinator GSB beoordeelt de verschillen tussen de twee invoeren.](#de-coördinator-gsb-beoordeelt-de-verschillen-tussen-de-twee-invoeren-zee)

9a. De applicatie stelt vast dat een invoerder waarschuwingen heeft geaccepteerd:  
&emsp; 9a1. De coördinator GSB beoordeelt de geaccepteerde waarschuwingen.

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
3. De invoerder vult de resultaten van de telling in.
4. (tijdens invoer) De applicatie stelt vast dat de invoer voldoet aan
   de [validatieregels voor fouten](./validatieregels-plausibiliteitschecks-tellingen.md#validatieregels-geven-fouten) en de [plausibiliteitschecks](./validatieregels-plausibiliteitschecks-tellingen.md#plausibiliteitschecks-geven-waarschuwingen).
5. De invoerder bevestigt in de applicatie klaar te zijn met de invoer van het stembureau.

__Uitbreidingen:__  
1a. De invoerder kan het stembureau op het PV niet in de applicatie vinden:  
&emsp; 1a1. De invoerder verwittigt de coördinator GSB.  
&emsp; 1a2. De coördinator GSB en de invoerder vinden alsnog het stembureau.  
&emsp; &emsp; 1a2a. Het stembureau is niet aanwezig in de applicatie:  
&emsp; &emsp; &emsp; 1a2a1. De coördinator GSB voegt het stembureau toe in de applicatie.  
1b. De tweede invoerder heeft ook de eerste invoer gedaan:  
&emsp; 1b1. De applicatie voorkomt dat de invoer wordt gestart.  
1c. De invoerder selecteert een ander stembureau dan op het PV staat:  
&emsp; 1c1. De invoerder merkt de fout op (naam en nummer stembureau komen niet overeen).  
&emsp; 1c2. De invoerder breekt de invoer af en kiest ervoor om de invoer niet te bewaren.  
1d. De invoerder selecteert een stembureau waar iemand anders mee bezig is:  
&emsp; 1d1. De applicatie voorkomt dat de invoer wordt gestart.  
1e. De invoerder selecteert een stembureau waar een andere gebruiker invoer voor heeft opgeslagen:  
&emsp; 1e1. De applicatie voorkomt dat de invoer wordt gestart.  
1f. De invoerder selecteert een stembureau waarvan de invoer al definitief is:  
&emsp; 1f1. De applicatie voorkomt dat de invoer wordt gestart.

2a. De applicatie stelt vast dat de invoerder eerdere invoer voor het stembureau heeft opgeslagen:  
&emsp; 2a1. De applicatie laadt de eerder ingevoerde data.

4a. De invoer voldoet niet aan de validatieregels voor fouten of aan de plausibiliteitschecks:  
&emsp; 4a1. De applicatie toont een foutmelding voor elke gefaalde validatieregel en een waarschuwing voor elke gefaalde plausibiliteitscheck. 
&emsp; 4a2. [De invoerder handelt de fout(en) en/of waarschuwing(en) af.](#de-invoerder-handelt-de-fouten-en-of-waarschuwingen-af-vis)

5a. De invoerder breekt de invoer af en bewaart de invoer:  
&emsp; 5a1. De applicatie slaat de invoer op, gekoppeld aan de invoerder.  
&emsp; 5a2. De applicatie laadt de pagina voor het selecteren van een stembureau.  
5b. De invoerder breekt de invoer af en bewaart de invoer niet:  
&emsp; 5b1. De applicatie verwijdert de invoer voor het stembureau.  
&emsp; 5b2. De applicatie laadt de pagina voor het selecteren van een stembureau.

## De coördinator GSB beoordeelt de verschillen tussen de twee invoeren (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De coördinator GSB bekijkt de verschillen tussen de twee invoeren.
2. De coördinator GSB stelt vast dat één van de twee invoeren overeenkomt met het papier.
3. De coördinator GSB accepteert de correcte invoer en gooit de andere invoer weg.
4. De applicatie behandelt de geaccepteerde invoer als een eerste invoer. (Dus bij nieuwe tweede invoer: waarschuwingen over verschillen met geaccepteerde invoer.)
5. De coördinator GSB geeft het PV aan een invoerder om nogmaals in te voeren.

__Uitbreidingen:__  
2a. Geen van beide invoeren komt overeen met het papier:  
&emsp; 2a1. De coördinator GSB verwijdert beide invoeren.  
&emsp; 2a2. De coördinator GSB laat het stembureau opnieuw invoeren door twee invoerders.

### Niet in scope

- Gebruiksvriendelijker alternatief is om afhankelijk van het aantal verschillen drie opties te geven: (1) coördinator GSB kiest één invoer en voegt een verklaring toe aan "Bijzonderheden"; (2) coördinator GSB laat alleen de afwijkende lijst(en) opnieuw invoeren; (3) coördinator GSB laat de volledige invoer opnieuw doen.

## De coördinator GSB beoordeelt de geaccepteerde fouten (zee).

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De coördinator GSB bekijkt de geaccepteerde fouten en eventuele waarschuwingen.
2. Het PV wordt onderzocht om te bepalen of er fouten hersteld kunnen worden.
3. De coördinator GSB stelt vast het PV fouten bevat die kunnen worden opgelost.
4. De coördinator laat de fouten in het PV corrigeren en laat de invoerder verder gaan met diens invoer.

__Uitbreidingen:__  
3a. Het PV bevat fouten die niet opgelost kunnen worden:  
&emsp; 3a1. De coördinator GSB verwijdert de invoer.  
&emsp; 3a2. De coördinator GSB laat het stembureau opnieuw invoeren.

## De invoerder handelt de fout(en) en/of waarschuwing(en) af (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Trigger:__ De controles geven een of meerdere foutmeldingen vanwege de [validatieregels voor fouten](./validatieregels-plausibiliteitschecks-tellingen.md#validatieregels-geven-fouten) en/of een of meerdere waarschuwingen vanwege de [plausibiliteitschecks](./validatieregels-plausibiliteitschecks-tellingen.md#plausibiliteitschecks-geven-waarschuwingen).

*Foutmelding*: De ingevoerde waardes kunnen niet correct zijn. Bijvoorbeeld: het totaal van de stemmen op een lijst komt niet overeen met de som van de stemmen van de kandidaten op die lijst.

*Waarschuwing*: De ingevoerde waardes zijn mogelijk niet correct. Bijvoorbeeld: er is een groot aantal blanco stemmen of de tweede invoer klopt niet met de eerste invoer.

__Hoofdscenario:__  
Voor elke fout of waarschuwing:  

1. De invoerder controleert de fout of waarschuwing.
2. De invoerder constateert dat de invoer klopt met het PV.
3. De invoerder accepteert de fouten en waarschuwingen in de applicatie.

__Uitbreidingen:__  
2a. De invoerder constateert dat hij/zij een fout heeft gemaakt in de invoer.  
&emsp; 2a1. De invoerder corrigeert de fout in de invoer.  

### Open punten

- Als de coördinator GSB het PV terugstuurt in het proces, naar welk punt dan precies?
