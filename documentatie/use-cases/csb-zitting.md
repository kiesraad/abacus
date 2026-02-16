# CSB: Zitting

## Centraal stembureau (CSB) stelt verkiezingsuitslag vast (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. Het CSB ontvangt het GSB PV incl. bijlagen (DSO: Na 31-1, CSO: Na 31-2) van de burgemeester.
2. Het CSB ontvangt alle overige documenten (PVs, onderliggende PVs, corrigenda, tellingsbestand EML 510b) van het GSB en controleert ze op volledigheid.
3. Het CSB stelt vast dat het GSB PV geen aanleiding geeft tot een terugverwijzing. (controleprotocol deel A)
4. [Het CSB voert de tellingen van het GSB in.](./csb-invoer-zitting.md#het-csb-voert-de-tellingen-van-het-gsb-in-vlieger)
5. Het CSB voert het controleprotocol optellingen uit. (controleprotocol deel B)
6. [Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan.](#het-csb-stelt-de-zetelverdeling-vast-en-wijst-de-gekozen-kandidaten-aan-vlieger)
7. De applicatie genereert de benodigde bestanden: PV P 22-2, tellingsbestanden EML 510d, EML 520.
8. De voorzitter CSB (burgemeester) tekent de benoemingsbrieven en de kennisgevingen tot geloofsbrief.
9. Het CSB voert het controleprotocol zetelverdeling uit. (controleprotocol deel C)
10. Het CSB opent de zitting.
11. Het CSB stelt de uitslag vast o.b.v. de P 22-2: controleren op compleetheid, voorlezen, er zijn geen bezwaren, ondertekenen. En sluit daarmee de zitting.
12. Het CSB publiceert de P 22-2, EML 510d en EML 520 op de website van de gemeente.
13. Het CSB stuurt alle PVs naar de gemeenteraad.
14. Het CSB deelt de EML 510d en EML 520 met de Kiesraad.

__Uitbreidingen:__

3a. Het GSB PV geeft aanleiding tot een terugverwijzing:  
&emsp; 3a1. Het CSB verwijst terug naar het GSB.  
&emsp; 3a2. [Gemeentelijk stembureau (GSB) stelt uitkomst vast in volgende zitting (corrigenda) (wolk)](gsb-volgende-zitting.md#gemeentelijk-stembureau-gsb-stelt-uitkomst-vast-in-volgende-zitting-corrigendum-wolk)  
&emsp; 3a3. (CSO) Het CSB voegt het Inlegvel Na 31-2 toe aan het PV Na 31-2.

4-11a. Het CSB moet nieuwe aantallen invoeren ter correctie van de eerder ingevoerde tellingen:  
&emsp; 4-11a1. Het CSB corrigeert de eerder ingevoerde aantallen in de applicatie. Er is dus geen tweede CSB-zitting.

11a. Er zijn bezwaren tijdens de zitting:  
&emsp; 11a1. Het CSB neemt de bezwaren op in het PV.  
&emsp; 11a2. Het CSB besluit dat geen van de bezwaren reden zijn tot een hertelling.  
&emsp;&emsp; 11a2a. Het CSB besluit dat een aantal stembureaus herteld moet worden:  
&emsp;&emsp;&emsp; 11a2a1. Het GSB voert de hertelling uit d.m.v. de corrigendum-flow.  
&emsp;&emsp;&emsp; 11a2a2. Het CSB stelt de nieuwe uitslag vast.  
&emsp;&emsp;&emsp; 11a2a3. Het CSB voegt de sectie "Hertelling" toe aan het oorspronkelijke PV.

13a. De gemeenteraad besluit dat een hertelling nodig is ([Artikel V 4a Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingIV_HoofdstukV_Paragraaf1_ArtikelV4a)):  
&emsp; 13a1. Het GSB doet de hertelling d.m.v. de corrigendum-flow.  
&emsp; 13a2. De CSB stelt de nieuwe uitslag vast.  
&emsp; 13a3. Het CSB maakt een nieuwe P 22-2, EML 510d en EML 520 aan met alleen de nieuwe uitslag.

### Niet in scope

- Tellingsbestand in csv-formaat.
- Elektronische handtekening van documenten.
- CSB besluit tijdens de zitting tot spontane hertelling. Resulteert in samenvoegen van oud en nieuw P22. Vereist wel aanmaken van nieuwe verkiezingen (GR GSB en GR CSB) in Abacus.
- De benoemingsbrieven en de kennisgevingen tot geloofsbrief.
    - Hoe faciliteren we gemeentes in het bepalen van de layout (bijv. gebruik huisstijl gemeente).
    - Als de applicatie deze moet genereren, dan moeten we ook de totalenlijst i.p.v. de kandidatenlijsten importeren.


## Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

Zie ook [Zetelverdeling en aanwijzing kandidaten bij gemeenteraadsverkiezingen](../verkiezingsproces/zetelverdeling-GR.md)

__Hoofdscenario:__

1. Het CSB markeert overleden kandidaten.
2. Het CSB stelt de zetelverdeling vast.
3. Het CSB wijst de gekozen kandidaten aan.

__Uitbreidingen:__

2a. Er zijn geen geldige stemmen uitgebracht op kandidaten:  
&emsp; 2a1. De applicatie toont een foutmelding om contact op te nemen met de Kiesraad.

2b. Er zijn minder beschikbare restzetels dan lijsten met gelijke overschotten of gemiddelden:  
&emsp; 2b1. Het CSB kent de restzetel bij loting toe.

2c. (art P 9) Een lijst heeft een meerderheid van stemmen, maar geen meerderheid van zetels:  
&emsp; 2c1. De applicatie kent de laatst toegewezen restzetel toe aan die lijst.  
&emsp; 2c1a. De laatst toegewezen restzetel was toegekend op basis van een gelijk gemiddelde of overschot:  
&emsp;&emsp; 2c1a1. Het CSB bepaalt bij loting bij welke lijst de restzetel wordt weggehaald.

2d. (art P 10 lijstuitputting) Er zijn meer zetels aan een lijst toegekend dan dat er kandidaten op de lijst staan:  
&emsp; 2d1. De applicatie berekent de zetelverdeling opnieuw met inachtneming van de lijstuitputting.  
&emsp; 2d1a. Er zijn te weinig kandidaten om alle aan lijsten toegewezen zetels te vullen:  
&emsp;&emsp; 2d1a1. De applicatie toont een foutmelding om contact op te nemen met de Kiesraad.

3a. Er zijn minder beschikbare zetels dan kandidaten met gelijke behaalde (voorkeur)stemmen:  
&emsp; 3a1. Het CSB kent de zetel bij loting toe.

### Buiten scope
- Er is een voorgestelde wetswijziging dat lijsten de kiesdeler moeten halen om een restzetel te kunnen krijgen. De minister is voornemens de vragen in het verslag wetsvoorstel te beantwoorden na de gemeenteraadsverkiezingen van 2026. Deze wetswijziging gaat dus niet in vóór GR 2026.
