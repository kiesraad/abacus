# Uiterste use cases (GR)

# De beheerder richt de applicatie in

_Niveau:_ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

1. [De beheerder installeert de applicatie.](./installeren-en-inrichten-applicatie.md#de-beheerder-installeert-de-applicatie-zee)

2. De beheerder leest de verkiezingsdefinitie in.

3. De beheerder leest de kandidatenlijst in.

4. [De beheerder maakt de stembureaus aan.](./installeren-en-inrichten-applicatie.md#de-beheerder-zet-de-stembureaus-in-de-applicatie-zee)

5. De beheerder maakt de gebruikers aan.

__Uitbreidingen:__  
2a. De applicatie geeft een foutmelding bij het inlezen van de verkiezingsdefinitie:

3a. De applicatie geeft een foutmelding bij het inlezen van de kandidatenlijst:

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)

_Niveau:_ hoog-over, wolk, ☁️

Voor DSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-dso-wolk).

### Hoofdscenario en uitbreidingen

1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. (voor elk stembureau) Het GSB doet de telling op lijst- en kandidaatniveau en vult Na31-2 Bijlage 2 in.
4. (voor elk stembureau) [Het GSB voert de tellingen uit Bijlage 2 in de applicatie in.](./invoer-eerste-zitting.md#het-gsb-voert-de-tellingen-in-de-applicatie-in-vlieger)
5. [Het GSB genereert het concept-PV en het elektronisch bestand in de applicatie.](./gsb-genereren-bestanden.md#het-gsb-genereert-het-concept-pv-en-het-elektronisch-bestand-in-de-applicatie-zee)
6. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
7. Het GSB stelt de gemeentelijke totalen vast o.b.v. het concept-PV: controleren op compleetheid, voorlezen, eventuele bezwaren noteren, ondertekenen. En sluit daarmee de zitting.
8. Het GSB stelt de benodigde digitale bestanden beschikbaar aan het CSB voor de uitslagvaststelling.  

__Uitbreidingen:__  
4a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

4b. Er moeten hertellingen uitgevoerd worden vanwege foutmeldingen en/of waarschuwingen:  
&emsp; 3b1. Het GSB voert de hertelling uit.  
&emsp; 3b2. Het GSB vult een nieuwe Bijlage 2 in.  
&emsp; 3b3. Het GSB voert de nieuwe Bijlage 2 in de applicatie in.  
&emsp; 3b4. Het GSB vermeldt het stembureau bij "extra onderzoeken van het GSB" in het concept-PV. (stap 4)

6a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 5a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 5a2. Het GSB vindt een fout en corrigeert de resultaten van het controleprotocol.  
&emsp;&emsp; 5a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 5a2a1. Het GSB neemt contact op met de Kiesraad.  

7a. Het GSB stelt een probleem vast met het concept-PV:  
&emsp; 6a1. Het GSB stelt het bezwaar vast.  
&emsp; 6a2. Het GSB gaat over tot hertelling. (zie uitbreiding 3b)

#### Open punten

- Het CSB heeft dus niet de beschikking over het papieren PV met Bijlages 2?
- Hoe ziet de overdracht van het elektronisch bestand van GSB naar CSB er precies uit? De enige wettelijke eis is "er vindt overdracht plaats". Randvoorwaarden voor de oplossing zijn: de hash wordt gecontroleerd, overdracht blijft zo dicht mogelijk bij de applicatie, er zit ongeveer een week tussen de zittingen van GSB en CSB, overdracht moet meermaals kunnen (bij nieuwe zitting GSB).
- Als een GSB tot hertelling overgaat vanwege foutmeldingen en/of waarschuwingen, corrigeren ze dan de Bijlage 2? Gooien ze de oude weg en stellen een nieuwe op? Iets anders?



## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. DSO (wolk)

_Niveau:_ hoog-over, wolk, ☁️

Voor CSO zie [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-cso-wolk).

### Hoofdscenario en uitbreidingen

Nog op te stellen obv Hoofdscenario CSO.

__Uitbreidingen:__

Nog op te stellen obv Uitbreidingen CSO.


## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

Nog na te lopen.

### Hoofdscenario en uitbreidingen

__Trigger:__ één of meer stembureaus moeten herteld worden n.a.v. verzoek CSB

__Hoofdscenario:__  

1. Het GSB opent de zitting.
2. (voor elk te hertellen stembureau) Het GSB stelt de uitslag van een stembureau opnieuw vast.
3. (voor elk herteld stembureau met gewijzigde uitslag) [Het GSB voert de corrigendum PV's in de applicatie in.](./invoer-tweede-zitting.md#het-gsb-voert-de-corrigendum-pvs-in-de-applicatie-in-vlieger)
4. Het GSB sluit de zitting.
5. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__Uitbreidingen:__
2a. Er zijn hertelde stembureaus met ongewijzigde uitslag:  
2b. Er zijn alleen hertelde stembureaus met ongewijzigde uitslag:  

### Open punten

- Maakt het voor de tweede zitting uit of een gemeente DSO of CSO doet?
- Hoe ziet de trigger voor hertelling er precies uit voor gemeenteraadsverkiezingen? Het GSB (dus de gemeente) stelt de telling op gemeente-niveau vast, het CSB (ook de gemeente) controleert die telling en verzoekt als nodig om onderzoek en/of hertelling?


## Centraal stembureau (CSB) stelt verkiezingsuitslag vast (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB ontvangt de benodigde digitale bestanden (PV, onderliggende PVs, elektronische bestanden, corrigenda) van het GSB en controleert ze op volledigheid.
2. Het CSB stelt vast dat het PV geen aanleiding geeft tot een terugverwijzing. (controleprotocol deel A)
3. Het CSB leest het elektronisch bestand in als eerste invoer. (controle hash-code en importeren)
4. Het CSB voert de resultaten handmatig in als tweede invoer.
5. Het CSB voert het controleprotocol optellingen uit. (controleprotocol deel B)
6. [Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan.](./csb-zetelverdeling-aanwijzing-kandidaten.md#het-csb-stelt-de-zetelverdeling-vast-en-wijst-de-gekozen-kandidaten-aan-vlieger)
8. De applicatie genereert de benodigde bestanden: concept-PV, digitaal bestand(en). Locatie en datum, namen stembureauleden, bezwaren, opmerkelijkheden, ...?
9. De applicatie geneert de benoemingsbrieven en de kennisgevingen tot geloofsbrief.
10. De voorzitter CSB (burgemeester) tekent de brieven.
11. Het CSB voert het controleprotocol zetelverdeling uit. (controleprotocol deel C)
12. Het CSB opent de zitting.
13. Het CSB stelt de uitslag vast obv het concept-PV: controleren op compleetheid, voorlezen, eventuele bezwaren noteren, ondertekenen. En sluit daarmee de zitting.
14. Het CSB publiceert het digitaal bestand en het PV op de website van de gemeente.
15. Het CSB stuurt alle PVs naar de gemeenteraad.
16. Het CSB deelt het digitaal bestand met de Kiesraad.

__Uitbreidingen:__

2a. Het PV geeft aanleiding tot een terugverwijzing:  
&emsp;2a1. Het CSB verwijst terug naar het CSB.  
&emsp;2a2. Het GSB doet onderzoek en gaat eventueel over tot hertelling.  
&emsp;2a3. Het GSB deelt de resultaten van de terugverwijzing met het CSB.

3a. Het is niet mogelijk het digitaal bestand te importeren:  
&emsp;3a1. Het CSB doet de eerste invoer handmatig.

4a. Er zijn verschillen tussen eerste en tweede invoer:

13a. Er zijn bezwaren (kan alleen tijdens zitting):

### Open punten

- In [Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting d.m.v. CSO (wolk)](#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-eerste-zitting-dmv-cso-wolk) stelt het GSB alleen de digitale bestanden ter beschikking aan het CSB, maar in stap 1 van deze use case lijkt het CSB ook beschikking te hebben over de papieren PVs.
- Willen we de benoemingsbrieven en de kennisgevingen tot geloofsbrief door de applicatie laten genereren? Of doen we dat liever op een andere manier? Hoe faciliteren we gemeentes in het bepalen van de layout (bijv. gebruik huisstijl gemeente).
- Moet de applicatie ook de resultaten ter publicatie genereren? Bijvoorbeeld het `.csv` tellingsbestand.
- Als het niet mogelijk is het digitaal bestand te importeren, kan het CSB dan contact opnemen met het GSB om te proberen het probleem te verhelpen?
