# GSB: Eerste zitting

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)

_Niveau:_ hoog-over, wolk, ☁️

Voor DSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-dso-wolk).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. (voor elk stembureau) Het GSB doet de telling op lijst- en kandidaatniveau en vult Na31-2 Bijlage 2 in.
4. (voor elk stembureau) [Het GSB voert de tellingen uit Bijlage 2 in de applicatie in.](./gsb-invoer-eerste-zitting.md#het-gsb-voert-de-tellingen-in-de-applicatie-in-vlieger)
5. (parallel aan invoer stembureaus) [De coördinator voert bezwaren, bijzonderheden, etc. in.]() TODO
6. De coördinator genereert het concept-PV en het digitale bestand. En voegt "Bijlage 2: Bezwaren van aanwezigen op stembureaus" toe aan het PV.
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
&emsp; 4b4. Het GSB vermeldt het stembureau bij "extra onderzoeken van het GSB" in het concept-PV. (stap 4)

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

### Open punten

- Hoe ziet de overdracht van het digitale bestand van GSB naar CSB binnen de applicatie er precies uit?
  - De enige wettelijke eis is "er vindt overdracht plaats". Randvoorwaarden voor de oplossing zijn: de hash wordt gecontroleerd, overdracht blijft zo dicht mogelijk bij de applicatie, er zit ongeveer een week tussen de zittingen van GSB en CSB, overdracht moet meermaals kunnen (bij nieuwe zitting GSB).
  - Proces via uitwisselplatform loopt parallel.
- Na31-2 Bijlage 2 wordt Bijlage 1 in nieuwe modellen.
- Kunnen we het mogelijk maken om bezwaren en bijzonderheden in te voeren in de applicatie tijdens het voorlezen van het concept-PV?
- Gemeentes willen waarschijnlijk na de eerste zitting van het GSB de voorlopige zetelverdeling weten. Gaan we dit faciliteren in de applicatie?
- Resultaat controleprotocol in applicatie invoeren? Of met pen? Of in bijlage? Niet in ODT. Maar protocol na genereren concept-PV (na oplossen van evt problemen obv protocol)?? Verslag uitkomst controleprotocol. ==> met pen invullen
  - "verschillen geconstateerd": dan mag je PV weggooien en alles handmatig doen
  - dus met applicatie laten aanvinken: geen verschillen geconstateerd
  - controle voor concept-PV of vinkje + handtekening is definitief PV

- Ondertekenen is bijlage. Waar komt die vandaan?



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
5. De coördinator voert extra onderzoeken op stembureau-niveau van het GSB in.

__Uitbreidingen:__

3a. De coördinator vult in: "zie bijlage". (ook voor 4)

### Open punten

- Wat zit er precies in het digitale bestand?
- Moet de applicatie een preview van het te genereren PV tonen, zodat de coördinator die kan controleren en eventuele fouten kan herstellen?
- Worden de extra onderzoeken van het GSB ingevuld in de sectie "Nieuwe telling aantal toegelaten kiezers bij onverklaarde telverschillen"?
  - ja
  - nieuw model PV GSB: drie vinkjes: toegelaten kiezers opnieuw vastgesteld, onderzocht vanwege andere redenen, stembiljetten (deels) herteld?
  - nieuw Bijlage 2: tekst en vinkje, dus moeilijk voor invoerder
  - applicatie: vinkje Is er herteld?
  - onderscheid CSO en DSO