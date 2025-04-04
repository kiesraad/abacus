# CSB: Zitting

## Centraal stembureau (CSB) stelt verkiezingsuitslag vast (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB ontvangt het GSB PV (incl. bijlagen) van de burgemeester.
2. Het CSB ontvangt de benodigde digitale bestanden (PV, onderliggende PVs, digitale bestanden, corrigenda) van het GSB en controleert ze op volledigheid.
3. Het CSB stelt vast dat het PV geen aanleiding geeft tot een terugverwijzing. (controleprotocol deel A)
4. [Het CSB voert de tellingen van het GSB in.](./csb-invoer-zitting.md#het-csb-voert-de-tellingen-van-het-gsb-in-vlieger)
5. Het CSB voert het controleprotocol optellingen uit. (controleprotocol deel B)
6. [Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan.](#het-csb-stelt-de-zetelverdeling-vast-en-wijst-de-gekozen-kandidaten-aan-vlieger)
7. De applicatie genereert de benodigde bestanden: PV, digitaal bestand(en).
8. De voorzitter CSB (burgemeester) tekent de brieven.
9. Het CSB voert het controleprotocol zetelverdeling uit. (controleprotocol deel C)
10. Het CSB opent de zitting.
11. Het CSB stelt de uitslag vast obv het PV: controleren op compleetheid, voorlezen, er zijn geen bezwaren, ondertekenen. En sluit daarmee de zitting.
12. Het CSB publiceert het digitaal bestand en het PV op de website van de gemeente.
13. Het CSB stuurt alle PVs naar de gemeenteraad.
14. Het CSB deelt het digitale bestand met de Kiesraad.

__Uitbreidingen:__

3a. Het PV geeft aanleiding tot een terugverwijzing:  
&emsp; 3a1. Het CSB verwijst terug naar het GSB.  
&emsp; 3a2. [Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)](./gsb-tweede-zitting.md#gemeentelijk-stembureau-gsb-stelt-uitslag-vast-in-tweede-zitting-corrigenda-wolk)  

4-11a. Het CSB moet nieuwe aantallen invoeren ter correctie van de eerder ingevoerde tellingen:  
&emsp; 4-11a1. Het CSB corrigeert de eerder ingevoerde aantallen in de applicatie. Er is dus geen tweede zitting.

11a. Er zijn bezwaren (kan alleen tijdens zitting):

### Niet in scope

- Tellingsbestand in csv-formaat. Dit zal door het uitwisselplatform gedaan worden.
- Elektronische handtekening van documenten.
- CSB besluit tijdens de zitting tot spontane hertelling. Resulteert in samenvoegen van oud en nieuw P22. Vereist wel aanmaken van nieuwe verkiezingen (GR GSB en GR CSB) in Abacus.

### Open punten

- We willen zoveel mogelijk van het PV in de applicatie invoeren. Dus idealiter worden alleen de handtekeningen van de CSB-leden met pen gezet. Dat is niet wat er op dit moment in de use cases staat.
- In welke stap worden de volgende zaken in het PV opgenomen: locatie en datum, namen stembureauleden, opmerkelijkheden, ...?
- Willen we de benoemingsbrieven en de kennisgevingen tot geloofsbrief door de applicatie laten genereren? Of doen we dat liever op een andere manier?
    - Hoe faciliteren we gemeentes in het bepalen van de layout (bijv. gebruik huisstijl gemeente).
    - Als de applicatie deze moet genereren, dan moeten we ook de totalenlijst i.p.v. de kandidatenlijst importeren.
- Overzicht bijlages toevoegen? Komen niet uit de software. (P22-2)


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
