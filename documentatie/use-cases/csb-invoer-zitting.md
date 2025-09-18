# CSB: Invoer zitting

## Het CSB voert de tellingen van het GSB in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB leest het tellingsbestand (EML 510b) uit de database in als eerste invoer. (controle hash-code en importeren)
2. Het CSB voert de resultaten handmatig in als tweede invoer.
3. De applicatie stelt vast dat beide invoeren gelijk zijn.
4. De applicatie slaat het definitieve resultaat op.

__Uitbreidingen:__

1a. De CSB-applicatie draait op een andere machine dan de GSB-applicatie:  
&emsp; 1a1. Het CSB importeert het digitale bestand.

1b. Het is niet mogelijk het tellingsbestand te importeren:  
&emsp; 1b1. Het CSB lost in overleg met het GSB het probleem op en importeert alsnog het bestand.  
&emsp; 1b1a. Het CSB slaagt er niet in het probleem op te lossen:  
&emsp;&emsp; 1b1a1. Het CSB doet de eerste invoer handmatig.

3a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 3a1. [De coördinator CSB beoordeelt de verschillen tussen de twee invoeren.](#de-coördinator-csb-beoordeelt-de-verschillen-tussen-de-twee-invoeren-zee)

### Open punten
- De startdatum en -tijd van de zitting CSB zijn bekend, hoewel de zitting pas plaats vindt, nadat alle gegevens in de applicatie zijn ingevoerd. Willen we dat de coördinator de gegevens van de zitting alvast invoert?
- Anders dan bij het GSB, gebeurt de invoer CSB vóór het openen van de zitting. Dus laten we alleen de invoer openstellen door de coördinator CSB en moet deze niet aangeven in de applicatie dat de zitting geopend is?


## De coördinator CSB beoordeelt de verschillen tussen de twee invoeren (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__
1. De coördinator CSB vergelijkt de eerste en tweede invoer met het papieren PV.  
2. De coördinator CSB stelt vast dat de digitale invoer correct is, maar de handmatige invoer niet.
3. De coördinator CSB gooit de handmatige invoer weg.
4. De coördinator CSB laat opnieuw handmatig invoeren.

__Uitbreidingen:__  
2a. De coördinator CSB stelt vast dat de digitale invoer incorrect is, maar de handmatige wel correct is:  
&emsp; 2a1. De coördinator CSB gooit de digitale invoer weg.  
&emsp; 2a2. De coördinator CSB laat een keer extra handmatig invoeren.

2b. De coördinator CSB stelt vast dat zowel de digitale als de handmatige invoer niet correct zijn:  
&emsp; 2b1. De coördinator CSB gooit beide invoeren weg.  
&emsp; 2b2. De coördinator CSB laat twee keer opnieuw handmatig invoeren.

2c. Beide invoeren zijn handmatig gedaan:  
&emsp; 2c1. De coördinator CSB gooit de incorrecte invoer(en) weg.  
&emsp; 2c2. De coördinator CSB laat de invoer(en) opnieuw handmatig invoeren.
