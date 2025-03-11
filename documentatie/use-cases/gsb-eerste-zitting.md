# GSB: Eerste zitting

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)

_Niveau:_ hoog-over, wolk, ☁️

Voor DSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-dso-wolk).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. (voor elk stembureau) Het GSB doet de telling op lijst- en kandidaatsniveau en vult Na31-2 Bijlage 2 in.
4. (voor elk stembureau) [Het GSB voert de tellingen uit Bijlage 2 in de applicatie in.](./gsb-invoer-eerste-zitting.md#het-gsb-voert-de-tellingen-in-de-applicatie-in-vlieger)
5. (parallel aan invoer stembureaus) [De coördinator voert bezwaren, bijzonderheden, etc. in.](#de-coördinator-voert-bezwaren-bijzonderheden-etc-in-zee)
6. De coördinator genereert het [concept-PV](./input-output-bestanden.md#output-voor-csb) en het [digitale bestand](./input-output-bestanden.md#output-voor-csb). En voegt "Bijlage 2: Bezwaren van aanwezigen op stembureaus" toe aan het PV.
7. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
8. Het GSB stelt de gemeentelijke totalen vast o.b.v. het concept-PV: controleren op compleetheid, voorlezen, geen additionele bezwaren en bijzonderheden, ondertekenen. En sluit daarmee de zitting.
9. Het GSB stelt de benodigde digitale bestanden beschikbaar aan het CSB voor de uitslagvaststelling.
10. Het GSB stelt het PV GSB (inc. bijlagen) beschikbaar aan de burgemeester.
11. De burgemeester publiceert het PV GSB (inc. bijlagen) en brengt het over naar het CSB.

__Uitbreidingen:__  
4a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

4b. Er moeten hertellingen uitgevoerd worden vanwege foutmeldingen en/of waarschuwingen:  
&emsp; 4b1. Het GSB voert de hertelling uit.  
&emsp; 4b2. Het GSB corrigeert de Bijlage 2 of vult een nieuwe Bijlage 2 in.  
&emsp; 4b3. Het GSB voert de nieuwe Bijlage 2 in de applicatie in.  
&emsp; 4b4. Het GSB vermeldt het stembureau bij "extra onderzoeken van het GSB" in het concept-PV.

7a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 7a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 7a2. Het GSB vindt een fout en corrigeert de resultaten van het controleprotocol.  
&emsp;&emsp; 7a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 7a2a1. Het GSB neemt contact op met de Kiesraad.  

8a. Het GSB stelt een probleem vast met het concept-PV:  
&emsp; 8a1. Het GSB stelt het bezwaar vast.  
&emsp; 8a2. Het GSB gaat over tot hertelling. (zie uitbreiding 4b)

8b. Er zijn bezwaren en/of bijzonderheden tijdens het voorlezen van het concept-PV:  
&emsp;8b1. Het GSB voegt de bijzonderheden en/of bezwaren met de hand toe aan het papieren concept-PV.

### Niet in scope

- Elektronische handtekening van documenten.
- Invoeren van het resultaat controleprotocol (handmatige controle optellingen software). N.B. Als het controleprotocol verschillen oplevert, dan is er een probleem met het concept-PV uit de applicatie en kan dat PV dus niet gebruikt worden.
- Het GSB faciliteren in het berekenen van een voorlopige zetelverdeling. (nooit in scope)

### Open punten

- Hoe ziet de overdracht van het digitale bestand van GSB naar CSB binnen de applicatie er precies uit?
  - De enige wettelijke eis is "er vindt overdracht plaats". Randvoorwaarden voor de oplossing zijn: de hash wordt gecontroleerd, overdracht blijft zo dicht mogelijk bij de applicatie, er zit ongeveer een week tussen de zittingen van GSB en CSB, overdracht moet meermaals kunnen (bij nieuwe zitting GSB).
  - Proces via uitwisselplatform loopt parallel.
- Na31-2 Bijlage 2 wordt Bijlage 1 in nieuwe modellen.
- Kunnen we het mogelijk maken om bezwaren en bijzonderheden in te voeren in de applicatie tijdens het voorlezen van het concept-PV?
- Moet de applicatie een preview van het te genereren PV tonen, zodat de coördinator die kan controleren en eventuele fouten kan herstellen?
  - Preview: bestand genereren met "concept" in watermerk en in bestandsnaam.


## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)

_Niveau:_ hoog-over, wolk, ☁️

Voor CSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-cso-wolk).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

Nog op te stellen o.b.v. Hoofdscenario CSO.

__Verschillen met CSO:__  

- Model van resultaten SB is anders dan Bijlage 2 (straks: BIjlage 1) bij CSO.
- Geen "Is er herteld?" op SB PV
- toetsing van tellingen avond daarvoor, evt door foutopsporingsmodus
  - extra feature foutopsporingsmodus: applicatie genereert corrigendum-template met oorspronkelijke/oude telling
- Een hertelling van een stembureau leidt tot corrigendum op het SB PV. PV en corrigendum worden daarna samen ingevoerd in de applicatie.
- ...?

__Uitbreidingen:__

Nog op te stellen o.b.v. Uitbreidingen CSO.

#### Open punten

- Is het wenselijk om een 'leeg' corrigendum (wel ingevuld: kandidatenlijsten (keuze welke lijsten), stembureau(?), gemeente, oorspronkelijke resultaten?) te kunnen genereren in applicatie?
  - N 10-1 (PV SB DSO) en Na 14-1 (corrigendum op PV SB DSO)
  - Ja.
  - Meerdere opties mogelijk:
    - minimaal kandidatenlijst en gemeente
    - extra: stembureau en oorspronkelijke resultaten SB




## De coördinator GSB bewerkt de stembureaus tijdens de eerste of nieuwe zitting (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario 1:__

1. De coördinator GSB verneemt dat een stembureau niet open is gegaan.
2. De coördinator stelt vast dat het stembureau op de gepubliceerde lijst staat en in de applicatie staat.
3. De coördinator GSB verwijdert het stembureau.
4. De applicatie toont een waarschuwing dat elke aanpassing op een stembureau, waardoor die afwijkt van de gepubliceerde lijst, opgenomen moet worden in het PV.

__Hoofdscenario 2:__

1. De coördinator GSB stelt vast dat de stembureaus in de applicatie niet kloppen met de gepubliceerde lijst.
2. De coördinator GSB corrigeert de stembureaus in de applicatie.
3. De applicatie toont een waarschuwing dat elke aanpassing op een stembureau, waardoor die afwijkt van de gepubliceerde lijst, opgenomen moet worden in het PV.

### Niet in scope

- Bij verwijderen stembureau kan de coördinator GSB de reden invoeren, die dan automatisch wordt opgenomen in het PV dat door de applicatie wordt gegenereerd.
- Het opnemen van andere bijzonderheden i.v.m. stembureaus in het PV, bijv. stembureau dat halverwege de dag werd gesloten. Dit is een andere use case en feature.

### Open punten

- Kan ook de beheerder tijdens een zitting de lijst met stembureaus corrigeren?



## De coördinator voert bezwaren, bijzonderheden, etc. in. (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De coördinator is ingelogd in de applicatie.

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De coördinator voert de datum en locatie van de zitting in.
2. De coördinator voert de aanwezige leden van het GSB in.
3. De coördinator voert de bezwaren van kiezers/belangstellenden tijdens de zitting in.
4. De coördinator voert onregelmatigheden of bijzonderheden tijdens de zitting in.

__Uitbreidingen:__

3a. De coördinator vult in: "zie bijlage".

4a. De coördinator vult in: "zie bijlage".

### Open punten

- Voert de coördinator de sectie "Nieuwe telling aantal toegelaten kiezers bij onverklaarde telverschillen" in? Of doet de applicatie dat?
  - Nieuw model GSB PV heeft drie vinkjes: toegelaten kiezers opnieuw vastgesteld, onderzocht vanwege andere redenen, stembiljetten (deels) herteld.
  - De SB PVs verschillen hierin tussen DSO en CSO.
  - Als de applicatie dit moet doen, moeten de invoerders dit over kunnen nemen van het SB PV.
  - De applicatie gaat nog uit van de oude modellen, met alleen de vraag "Is er herteld?"
