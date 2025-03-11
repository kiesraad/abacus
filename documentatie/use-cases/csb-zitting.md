# CSB: Zitting

## Centraal stembureau (CSB) stelt verkiezingsuitslag vast (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB ontvangt het GSB PV (incl. bijlagen) van de burgemeester.
2. Het CSB ontvangt de benodigde digitale bestanden (PV, onderliggende PVs, digitale bestanden, corrigenda) van het GSB en controleert ze op volledigheid.
3. Het CSB stelt vast dat het PV geen aanleiding geeft tot een terugverwijzing. (controleprotocol deel A)
4. [Het CSB voert de tellingen van het GSB in.](#het-csb-voert-de-tellingen-van-het-gsb-in-vlieger)
5. Het CSB voert het controleprotocol optellingen uit. (controleprotocol deel B)
6. [Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan.](#het-csb-stelt-de-zetelverdeling-vast-en-wijst-de-gekozen-kandidaten-aan-vlieger)
7. De applicatie genereert de benodigde bestanden: concept-PV, digitaal bestand(en). Locatie en datum, namen stembureauleden, opmerkelijkheden, ...?
8. De voorzitter CSB (burgemeester) tekent de brieven.
9. Het CSB voert het controleprotocol zetelverdeling uit. (controleprotocol deel C)
10. Het CSB opent de zitting.
11. Het CSB stelt de uitslag vast obv het concept-PV: controleren op compleetheid, voorlezen, er zijn geen bezwaren, ondertekenen. En sluit daarmee de zitting.
12. Het CSB publiceert het digitaal bestand en het PV op de website van de gemeente.
13. Het CSB stuurt alle PVs naar de gemeenteraad.
14. Het CSB deelt het digitale bestand met de Kiesraad.

__Uitbreidingen:__

3a. Het PV geeft aanleiding tot een terugverwijzing:  
&emsp;3a1. Het CSB verwijst terug naar het GSB.  
&emsp;3a2. Het GSB doet onderzoek en gaat eventueel over tot hertelling.  
&emsp;3a3. Het GSB deelt de resultaten van de terugverwijzing met het CSB.

11a. Er zijn bezwaren (kan alleen tijdens zitting):

### Niet in scope

- Tellingsbestand in `csv`-formaat. Dit zal door het uitwisselplatform gedaan worden.
- Elektronische handtekening van documenten.
- CSB besluit tijdens de zitting tot spontane hertelling. Resulteert in samenvoegen van oud en nieuw P22. Vereist wel aanmaken van nieuwe verkiezingen (GR GSB en GR CSB) in Abacus.

### Open punten

- Willen we de benoemingsbrieven en de kennisgevingen tot geloofsbrief door de applicatie laten genereren? Of doen we dat liever op een andere manier?
    - Hoe faciliteren we gemeentes in het bepalen van de layout (bijv. gebruik huisstijl gemeente).
    - Als de applicatie deze moet genereren, dan moeten we ook de totalenlijst i.p.v. de kandidatenlijst importeren.
- Overzicht bijlages toevoegen? Komen niet uit de software. (P22-2)


## Het CSB voert de tellingen van het GSB in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB leest het digitale bestand in als eerste invoer. (controle hash-code en importeren)
2. Het CSB voert de resultaten handmatig in als tweede invoer.
3. De applicatie stelt vast dat beide invoeren gelijk zijn.
4. De applicatie slaat het definitieve resultaat op.

__Uitbreidingen:__

1a. Het is niet mogelijk het digitale bestand te importeren:  
&emsp;1a1. Het CSB lost in overleg met het GSB het probleem op en importeert alsnog het bestand.  
&emsp;1a1a. Het CSB slaagt er niet in het probleem op te lossen:  
&emsp;&emsp;1a1a1. Het CSB doet de eerste invoer handmatig.

3a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 3a1. De coördinator vergelijkt de eerste en tweede invoer met het papieren PV.  
&emsp; 3a2. De coördinator stelt vast dat de tweede (handmatige) invoer correct is.  
&emsp;&emsp;3a2a. De coördinator stelt vast dat de tweede (handmatige) invoer niet correct is en het digitale bestand correct is:  
&emsp;&emsp;&emsp;3a2a1. De coördinator gooit de tweede (handmatige) invoer weg en laat die opnieuw invoeren.  
&emsp;&emsp;3a2b. De coördinator stelt vast dat zowel de tweede (handmatige) invoer als het digitale bestand niet correct zijn:  
&emsp;&emsp;&emsp;3a2b1. De coördinator gooit beide invoeren weg en laat beide opnieuw handmatig invoeren.  
&emsp; 3a3. De coördinator markeert de tweede (handmatige) invoer als correct en gooit de andere invoer weg.
&emsp; 3a4. De coördinator geeft het PV aan een invoerder om nogmaals in te voeren.

## Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. Het CSB markeert overleden kandidaten.
2. Het CSB stelt de zetelverdeling vast.
3. Het CSB wijst de gekozen kandidaten aan.

__Uitbreidingen:__

2a. Er zijn minder beschikbare restzetels dan lijsten met gelijke overschotten of gemiddelden:  
&emsp;2a1. De restzetel wordt bij loting toegekend.

3a. Er zijn minder beschikbare zetels dan kandidaten met gelijke behaalde (voorkeur)stemmen:  
&emsp;3a1. De zetel wordt bij loting toegekend.

3b. Er zijn meer zetels aan een lijst toegekend dan dat er kandidaten op de lijst staan (lijstuitputting):  
&emsp; 3b1. De zetelverdeling wordt opnieuw berekend met inachtneming van de lijstuitputting.  
&emsp; 3b2. De kandidaten worden o.b.v. de nieuwe zetelverdeling aangewezen.


### Buiten scope
- Er is een voorgestelde wetswijziging dat lijsten de kiesdeler moeten halen om een restzetel te kunnen krijgen. De minister is voornemens de vragen in het verslag wetsvoorstel te beantwoorden na de gemeenteraadsverkiezingen van 2026. Deze wetswijziging gaat dus niet in vóór GR 2026.
