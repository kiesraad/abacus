# GSB: Eerste zitting

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting (wolk)

_Niveau:_ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. Voor elk stembureau:
    - (CSO) Het GSB doet de telling op lijst- en kandidaatsniveau en vult Na 31-2 Bijlage 1 in.
    - (DSO) Het GSB stelt vast dat de tellingen die het stembureau heeft vastgesteld in N 10-1, kloppen.
4. De coördinator GSB bevestigt in de applicatie dat de lijst met stembureaus gelijk is aan de gepubliceerde lijst en start de invoerfase.
5. [De coördinator GSB en de invoerders voeren alle gegevens in de applicatie in.](./gsb-invoer-eerste-zitting.md#de-coördinator-gsb-en-de-invoerders-voeren-alle-gegevens-in-de-applicatie-in-vlieger)
6. [De coördinator GSB maakt het PV en het digitale bestand aan.](#de-coördinator-gsb-maakt-het-pv-en-het-digitale-bestand-aan-zee)
7. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
8. Het GSB stelt de gemeentelijke totalen vast o.b.v. het PV: controleren op compleetheid, voorlezen, geen additionele bezwaren en bijzonderheden, ondertekenen. En sluit daarmee de zitting.
9. Het GSB stelt de benodigde EML_NL bestanden beschikbaar aan het CSB voor de uitslagvaststelling.
10. Het GSB stelt het PV GSB (inc. bijlagen) beschikbaar aan de burgemeester.
11. De burgemeester publiceert het PV GSB (inc. bijlagen) en brengt het over naar het CSB.

__Uitbreidingen:__  

3a. (CSO) Het GSB gebruikt de applicatie om het SB PV te controleren:

3b. (DSO) Het GSB stelt vast dat de tellingen van het stembureau mogelijk niet kloppen:  
&emsp; 3b1. Het GSB doet een (gedeeltelijke) hertelling van het stembureau.  
&emsp; 3b1. Het GSB noteert de wijzigingen in een corrigendum Na 14-1.

4a. De lijst met stembureaus is niet gelijk:  
&emsp; 4a1. De coördinator annuleert het starten van de invoerfase.  
&emsp; 4a2. De coördinator wijzigt de lijst met stembureaus zodat deze overeenkomt met de gepubliceerde lijst.  
&emsp; 4a3. De coördinator gaat verder met stap 4.  

7a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 7a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 7a2. Het GSB vindt een fout in de resultaten van het controleprotocol en corrigeert deze.  
&emsp;&emsp; 7a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 7a2a1. Het GSB neemt contact op met de Kiesraad.  

8a. Het GSB stelt een probleem vast met het PV:  
&emsp; 8a1. Het GSB stelt het bezwaar vast.  
&emsp; 8a2. Het GSB gaat over tot hertelling. (zie uitbreiding 4b)

8b. Er zijn bezwaren en/of bijzonderheden tijdens het voorlezen van het PV:  
&emsp; 8b1. Het GSB voegt de bijzonderheden en/of bezwaren met de hand toe aan het papieren PV.


### Niet in scope

- "8a1. Het GSB stelt het bezwaar vast." Wat gebeurt hier precies?
- Elektronische handtekening van documenten.
- CSO: Invullen van "Bijlage 2: Bezwaren van aanwezigen op stembureaus" in de applicatie. Wordt wel handmatig toegevoegd aan het geprinte PV door coördinator GSB.
- Gemeentes willen waarschijnlijk na de eerste zitting van het GSB de voorlopige zetelverdeling weten. Dit gaan we niet faciliteren in de applicatie.
- Invoeren van het resultaat controleprotocol (handmatige controle optellingen software). N.B. Als het controleprotocol verschillen oplevert, dan is er een probleem met het PV uit de applicatie en kan dat PV dus niet gebruikt worden.
- Het GSB faciliteren in het berekenen van een voorlopige zetelverdeling. (nooit in scope)


### Open punten

- Hoe ziet de overdracht van het EML_NL bestand van GSB naar CSB binnen de applicatie er precies uit?
  - De enige wettelijke eis is "er vindt overdracht plaats". Randvoorwaarden voor de oplossing zijn: de hash wordt gecontroleerd, overdracht blijft zo dicht mogelijk bij de applicatie, er zit ongeveer een week tussen de zittingen van GSB en CSB, overdracht moet meermaals kunnen (bij nieuwe zitting GSB).
  - Proces via uitwisselplatform loopt parallel.
- Is het wenselijk om een 'leeg' corrigendum (wel ingevuld: kandidatenlijsten (keuze welke lijsten), stembureau(?), gemeente, oorspronkelijke resultaten?) te kunnen genereren in applicatie?
  - N 10-1 (PV SB DSO) en Na 14-1 versie 1 (corrigendum op PV SB DSO)
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
4. De applicatie vraagt om een verklaring van de wijziging. Deze verklaring wordt opgenomen in het proces-verbaal.

__Hoofdscenario 2:__

1. De coördinator GSB stelt vast dat de stembureaus in de applicatie niet kloppen met de gepubliceerde lijst.
2. De coördinator GSB corrigeert de stembureaus in de applicatie.
3. De applicatie vraagt om een verklaring van de wijziging. Deze verklaring wordt opgenomen in het proces-verbaal.

### Niet in scope

- Het opnemen van andere bijzonderheden i.v.m. stembureaus in het proces-verbaal, bijv. stembureau dat halverwege de dag werd gesloten. Dit hoort in de bezwaren en bijzonderheden van dat betreffende stembureau.


## De coördinator GSB maakt het PV en het digitale bestand aan (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. De applicatie stelt vast dat alle stembureaus definitieve invoer hebben en dat invoer is afgesloten.
2. De coördinator GSB genereert het [PV en het digitale bestand](./input-output-bestanden.md#gsb).
3. De coördinator GSB voegt "Bijlage 2: Bezwaren van aanwezigen op stembureaus" toe aan het PV.

__Uitbreidingen:__  
1a. Niet alle stembureaus hebben definitieve invoer:  

1b. De invoer is niet afgesloten:
