# GSB: Eerste zitting

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)

_Niveau:_ hoog-over, wolk, ☁️

Voor DSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-dso-wolk).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. (voor elk stembureau) Het GSB doet de telling op lijst- en kandidaatsniveau en vult Na 31-2 Bijlage 1 in.
4. De coördinator GSB opent de zitting in de applicatie en stelt de invoer open.
5. (voor elk stembureau) [Het GSB voert de tellingen uit Bijlage 1 in de applicatie in.](./gsb-invoer-eerste-zitting.md#het-gsb-voert-de-tellingen-in-de-applicatie-in-vlieger)
6. (parallel aan invoer stembureaus) [De coördinator GSB voert details zitting, bezwaren, bijzonderheden, etc. van de GSB-zitting in.](#de-coördinator-gsb-voert-details-zitting-bezwaren-bijzonderheden-etc-van-de-gsb-zitting-in-zee)
7. De coördinator GSB sluit de invoer.
8. [De coördinator GSB maakt het PV en het digitale bestand aan.](#de-coördinator-gsb-maakt-het-pv-en-het-digitale-bestand-aan-zee)
9. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
10. Het GSB stelt de gemeentelijke totalen vast o.b.v. het PV: controleren op compleetheid, voorlezen, geen additionele bezwaren en bijzonderheden, ondertekenen. En sluit daarmee de zitting.
11. De coördinator GSB sluit de zitting in de applicatie.
12. Het GSB stelt de benodigde EML_NL bestanden beschikbaar aan het CSB voor de uitslagvaststelling.
13. Het GSB stelt het PV GSB (inc. bijlagen) beschikbaar aan de burgemeester.
14. De burgemeester publiceert het PV GSB (inc. bijlagen) en brengt het over naar het CSB.

__Uitbreidingen:__  
TODO:  
- verwijderen van een zitting in de applicatie (alleen als geen latere zitting met invoer)
- zelfde aanpassingen in DSO use case
- De coördinator GSB kan een latere zitting openen. (als geen andere open zitting)

5a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

5b. Er moeten hertellingen uitgevoerd worden vanwege foutmeldingen en/of waarschuwingen:  
&emsp; 5b1. Het GSB voert de hertelling uit.  
&emsp; 5b2. Het GSB corrigeert de Bijlage 1 of vult een nieuwe Bijlage 1 in.  
&emsp; 5b3. Het GSB voert de nieuwe Bijlage 1 in de applicatie in.  
&emsp; 5b4. Het GSB vermeldt het stembureau bij "extra onderzoeken van het GSB" in het PV.

5-6a. De invoer moet tijdelijk geschorst worden:
&emsp; 5-6a1. De coördinator GSB pauzeert de invoer.

10a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 10a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 10a2. Het GSB vindt een fout en corrigeert de resultaten van het controleprotocol.  
&emsp;&emsp; 10a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 10a2a1. Het GSB neemt contact op met de Kiesraad.  

11a. Het GSB stelt een probleem vast met het PV:  
&emsp; 11a1. Het GSB stelt het bezwaar vast.  
&emsp; 11a2. Het GSB gaat over tot hertelling. (zie uitbreiding 4b)

11b. Er zijn bezwaren en/of bijzonderheden tijdens het voorlezen van het PV:  
&emsp; 11b1. Het GSB voegt de bijzonderheden en/of bezwaren met de hand toe aan het papieren PV.

12a. De coördinator GSB sluit de zitting niet:
&emsp; 12a1. (nadat de zitting meer dan een dag open staat) De applicatie toont een melding over het sluiten van de zitting en het openen van een nieuwe zitting.

12b. De coördinator GSB sluit per ongeluk de zitting:
&emsp; 12b1. De coördinator GSB heropent de zitting.
&emsp;&emsp; 12b1a. De applicatie stelt vast dat er een latere zitting met invoer is:
&emsp;&emsp;&emsp; 12b1a1. De applicatie toont een foutmelding en heropent de zitting niet.

### Niet in scope

- Elektronische handtekening van documenten.
- CSO: Invullen van "Bijlage 2: Bezwaren van aanwezigen op stembureaus" in de applicatie. Wordt wel handmatig toegevoegd aan het geprinte PV door coördinator GSB.
- Gemeentes willen waarschijnlijk na de eerste zitting van het GSB de voorlopige zetelverdeling weten. Dit gaan we niet faciliteren in de applicatie.
- Invoeren van het resultaat controleprotocol (handmatige controle optellingen software). N.B. Als het controleprotocol verschillen oplevert, dan is er een probleem met het PV uit de applicatie en kan dat PV dus niet gebruikt worden.
- Het GSB faciliteren in het berekenen van een voorlopige zetelverdeling. (nooit in scope)


### Open punten

- Is het toegestaan de zitting te sluiten als nog niet alle stembureaus definitieve invoer hebben? Dit wordt nu een stap later gecontroleerd, nl. vlak voor het genereren van het PV.
- Hoe ziet de overdracht van het EML_NL bestand van GSB naar CSB binnen de applicatie er precies uit?
  - De enige wettelijke eis is "er vindt overdracht plaats". Randvoorwaarden voor de oplossing zijn: de hash wordt gecontroleerd, overdracht blijft zo dicht mogelijk bij de applicatie, er zit ongeveer een week tussen de zittingen van GSB en CSB, overdracht moet meermaals kunnen (bij nieuwe zitting GSB).
  - Proces via uitwisselplatform loopt parallel.
- Kunnen we het mogelijk maken om bezwaren en bijzonderheden in te voeren in de applicatie tijdens het voorlezen van het PV?
- Moet de applicatie een preview van het te genereren PV tonen, zodat de coördinator GSB die kan controleren en eventuele fouten kan herstellen?
  - Preview: bestand genereren met "concept" in watermerk en in bestandsnaam.


## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)

__Niveau:__ hoog-over, wolk, ☁️

Voor CSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-cso-wolk).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. (voor elk stembureau) Het GSB stelt met de hand vast dat de tellingen die het stembureau heeft vastgesteld in N 10-1, kloppen.
4. (voor elk stembureau) [Het GSB voert de tellingen uit N 10-1 en evt. Na 14-1 in de applicatie in.](./gsb-invoer-eerste-zitting.md#het-gsb-voert-de-tellingen-in-de-applicatie-in-vlieger)
5. (parallel aan invoer stembureaus) [De coördinator GSB voert details zitting, bezwaren, bijzonderheden, etc. van de GSB-zitting in.](#de-coördinator-gsb-voert-details-zitting-bezwaren-bijzonderheden-etc-van-de-gsb-zitting-in-zee)
6. De coördinator GSB genereert het PV en het EML_NL bestand.
7. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
8. Het GSB stelt de gemeentelijke totalen vast o.b.v. het PV: controleren op compleetheid, voorlezen, geen additionele bezwaren en bijzonderheden, ondertekenen. En sluit daarmee de zitting.
9. Het GSB stelt de benodigde EML_NL bestanden beschikbaar aan het CSB voor de uitslagvaststelling.
10. Het GSB stelt het PV GSB (inclusief bijlagen) beschikbaar aan de burgemeester.
11. De burgemeester publiceert het PV GSB (inclusief bijlagen) en brengt het over naar het CSB.

__Uitbreidingen:__

3a. Het GSB gebruikt de applicatie om het SB PV te controleren:

3b. Het GSB stelt vast dat de tellingen van het stembureau mogelijk niet kloppen:  
&emsp;3b1. het GSB doet een (gedeeltelijke) hertelling van het stembureau.  
&emsp;3b1. Het GSB noteert de wijzigingen in een corrigendum Na 14-1.

#### Open punten

- Zijn de invoervelden voor de tellingen van een stembureau voor DSO gelijk aan die van CSO?
  - Waarschijnlijk niet, bijvoorbeeld geen "Is er herteld?" op SB PV.
  - Nieuwe modellen op nalopen.
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
2. De coördinator GSB stelt vast dat het stembureau op de gepubliceerde lijst staat en in de applicatie staat.
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


## De coördinator GSB maakt het PV en het digitale bestand aan (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. De applicatie stelt vast dat alle stembureaus definitieve invoer hebben en dat invoer is afgesloten.
2. De coördinator GSB genereert het [PV](./input-output-bestanden.md#output-voor-csb) en het [digitale bestand](./input-output-bestanden.md#output-voor-csb).
3. De coördinator GSB voegt "Bijlage 2: Bezwaren van aanwezigen op stembureaus" toe aan het PV.

__Uitbreidingen:__  
1a. Niet alle stembureaus hebben definitieve invoer:  

1b. De invoer is niet afgesloten:  