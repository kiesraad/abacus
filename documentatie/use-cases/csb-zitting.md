# CSB: Zitting

## Centraal stembureau (CSB) stelt verkiezingsuitslag vast (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB ontvangt het GSB PV (incl. bijlagen) van de burgemeester.
2. Het CSB ontvangt de benodigde digitale bestanden (PV, onderliggende PVs, digitale bestanden, corrigenda) van het GSB en controleert ze op volledigheid.
3. Het CSB stelt vast dat het PV geen aanleiding geeft tot een terugverwijzing. (controleprotocol deel A)
4. Het CSB leest het digitale bestand in als eerste invoer. (controle hash-code en importeren)
5. Het CSB voert de resultaten handmatig in als tweede invoer.
6. Het CSB voert het controleprotocol optellingen uit. (controleprotocol deel B)
7. [Het CSB stelt de zetelverdeling vast en wijst de gekozen kandidaten aan.](#het-csb-stelt-de-zetelverdeling-vast-en-wijst-de-gekozen-kandidaten-aan-vlieger)
8. De applicatie genereert de benodigde bestanden: concept-PV, digitaal bestand(en). Locatie en datum, namen stembureauleden, ~~bezwaren~~, opmerkelijkheden, ...?
9. De applicatie geneert de benoemingsbrieven en de kennisgevingen tot geloofsbrief. => open punt
10. De voorzitter CSB (burgemeester) tekent de brieven.
11. Het CSB voert het controleprotocol zetelverdeling uit. (controleprotocol deel C)
12. Het CSB opent de zitting.
13. Het CSB stelt de uitslag vast obv het concept-PV: controleren op compleetheid, voorlezen, er zijn geen bezwaren, ondertekenen. En sluit daarmee de zitting.
14. Het CSB publiceert het digitaal bestand en het PV op de website van de gemeente.
15. Het CSB stuurt alle PVs naar de gemeenteraad.
16. Het CSB deelt het digitale bestand met de Kiesraad.

__Uitbreidingen:__

3a. Het PV geeft aanleiding tot een terugverwijzing:  
&emsp;3a1. Het CSB verwijst terug naar het GSB.  
&emsp;3a2. Het GSB doet onderzoek en gaat eventueel over tot hertelling.  
&emsp;3a3. Het GSB deelt de resultaten van de terugverwijzing met het CSB.

4a. Het is niet mogelijk het digitale bestand te importeren:  
&emsp;4a1. Het CSB doet de eerste invoer handmatig.

5a. Er zijn verschillen tussen eerste en tweede invoer:

13a. Er zijn bezwaren (kan alleen tijdens zitting):

### Niet in scope

- Moet de applicatie ook de resultaten ter publicatie genereren? Bijvoorbeeld het `.csv` tellingsbestand. -> uitwisselplatform
- Elektronische handtekening van documenten.

### Open punten

- Willen we de benoemingsbrieven en de kennisgevingen tot geloofsbrief door de applicatie laten genereren? Of doen we dat liever op een andere manier? Hoe faciliteren we gemeentes in het bepalen van de layout (bijv. gebruik huisstijl gemeente).
- Als het niet mogelijk is het digitale bestand te importeren, kan het CSB dan contact opnemen met het GSB om te proberen het probleem te verhelpen?
- Geen elektronische handtekening.
- CSB kan tijdens de zitting overgaan tot spontane hertelling? Moet niets mee gedaan worden in software. Nieuwe P22 in de oude plakken (sandwich)? Niet applicatie, in proces. Maar wel nieuwe GR GSB en CSB nodig in Abacus.
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

### Open punten

- De Kieswet heeft het pas over het buiten beschouwing laten van overleden kandidaten tijdens de toewijzing van de gekozen kandidaten. Wat als een lijst evenveel zetels krijgt als kandidaten, maar één van die kandidaten is overleden?
- Er is een voorgestelde wetswijziging dat lijsten de kiesdeler moeten halen om een restzetel te kunnen krijgen. De minister is voornemens de vragen in het verslag wetsvoorstel te beantwoorden na de gemeenteraadsverkiezingen van 2026. Deze wetswijziging gaat dus niet in vóór GR 2026.

