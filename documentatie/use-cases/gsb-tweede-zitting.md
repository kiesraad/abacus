# GSB: Tweede zitting

N.B.: Alle use cases voor de tweede zitting gelden ook voor elke latere zitting (derde, etc.).

## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  
1. Het GSB ontvangt één of meerdere verzoeken tot onderzoek/hertelling van het CSB.
2. De coördinator GSB maakt de nieuwe zitting aan in de applicatie. Hiermee wordt de vorige zitting in de applicatie gesloten.
3. [De coördinator GSB bereidt de documenten voor de zitting voor.](#de-coördinator-gsb-bereidt-de-documenten-voor-de-zitting-voor-zee)
4. Het GSB opent de zitting. (Wanneer dat gebeurt, is een afweging van het GSB: het liefst pas als alle verzoeken binnen zijn, maar ook niet te lang wachten).
5. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
6. De coördinator GSB voert de locatie, startdatum en starttijd van de zitting in.
7. (voor elk verzoek) [Het GSB behandelt een verzoek tot onderzoek/hertelling.](#het-gsb-behandelt-een-verzoek-tot-onderzoekhertelling-vlieger)
8. [De coördinator GSB maakt het PV P 2a en evt. het PV Na 14-2 en tellingsbestand EML 510b aan.](#de-coördinator-gsb-maakt-het-pv-p-2a-en-evt-het-pv-na-14-2-en-tellingsbestand-eml-510b-aan-zee)
9. Het GSB voert de andere onderdelen van de PVs (P 2a en evt. Na 14-2) in.
10. Het GSB leest de PVs voor: P 2a (Verslag tweede zitting), evt. Na 14-2 (Corrigendum GSB), Na 14-1 versie 2 (DSO, één per SB) of Na 14-2 Bijlage 1 (CSO, één bijlage per SB).
11. Het GSB ondertekent de PVs (P2a, evt. Na 14-2, DSO: Na 14-1 versie 2).
12. Het GSB sluit de zitting.
13. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.
14. Het GSB stelt de PVs GSB beschikbaar aan de burgemeester.
15. De burgemeester publiceert de PVs GSB en brengt die over naar het CSB.

__Uitbreidingen:__

2a. Er is al een open zitting:  
&emsp; 2a1. De applicatie opent geen nieuwe zitting.

2b. De coördinator GSB opent per ongeluk de zitting in de applicatie:  
&emsp; 2b1. De coördinator GSB verwijdert de geopende zitting.  
&emsp;&emsp; 2b1a. Er is al invoer voor de geopende zitting:  
&emsp;&emsp;&emsp; 2b1a1. De applicatie verwijdert de geopende zitting niet.

2c. Er is geen eerste zitting in de applicatie:  
&emsp; 2c1. De coördinator importeert het EML_NL-bestand van de eerste zitting.

4-7a. Het GSB schorst de zitting, omdat er mogelijk nog een verzoek komt:

10a. Het GSB stelt een probleem vast met het PV:  
&emsp; 10a1. Het GSB stelt het bezwaar vast.  
&emsp; 10a2. Het GSB gaat over tot hertelling.

10b. Er zijn bezwaren en/of bijzonderheden tijdens het voorlezen van het PV:  
&emsp; 10b1. Het GSB voegt de bijzonderheden en/of bezwaren met de hand toe aan het papieren PV.

## De coördinator GSB bereidt de documenten voor de zitting voor (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. De coördinator GSB selecteert een stembureau en voert "Aanleiding van het onderzoek" (vrije tekst) in de applicatie in.
2. De applicatie genereert een 'leeg' corrigendum, Na 14-1 versie 2 (DSO) of Bijlage 1 van Na 14-2 (CSO). ('leeg' == klaar om in te vullen: kandidatenlijsten, oorspronkelijke tellingen, verzoek CSB (aanleiding))
3. De coördinator GSB drukt het 'lege' corrigendum af.

__Uitbreidingen:__  

1a. Het GSB besluit om n.a.v. een verzoek additionele stembureaus te onderzoeken:  
&emsp; 1a1. De coördinator GSB selecteert een stembureau en voert "Aanleiding van het onderzoek" (vrije tekst) in de applicatie in.  

1b. De coördinator GSB ontdekt dat een stembureau dat op de vooraf gepubliceerde lijst staat, niet in Abacus is opgenomen:  
&emsp; 1b1. De coördinator GSB voegt het stembureau toe.  
&emsp; 1b2. De coördinator GSB voert een verklaring voor de wijziging in.  
&emsp; 1b3. De applicatie maakt melding op het PV Na 14-2 dat het stembureau is toegevoegd.  
&emsp; 1b4. Het corrigendum corrigeert het aantal stemmen bij dit stembureau van 0 naar het werkelijke aantal.  

1c. De coördinator GSB ontdekt dat een stembureau ten onrechte is meegenomen in een eerdere zitting:  
&emsp; 1c1. Het GSB maakt een corrigendum naar 0 stemmen voor dit stembureau.  

1d. De coördinator GSB ontdekt een fout in de gegevens van een stembureau met resultaten uit een vorige zitting:  
&emsp; 1d1. [De coördinator GSB bewerkt de stembureaus tijdens de tweede zitting](#de-coördinator-gsb-bewerkt-de-stembureaus-tijdens-de-tweede-zitting-zee)

1e. De coördinator GSB ontdekt een fout in de gegevens van een stembureau dat voor de huidige zitting is toegevoegd:  
&emsp; 1e1. [De coördinator GSB bewerkt de stembureaus tijdens de tweede zitting](#de-coördinator-gsb-bewerkt-de-stembureaus-tijdens-de-tweede-zitting-zee)


## De coördinator GSB bewerkt de stembureaus tijdens de tweede zitting (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario 1:__
1. De coördinator GSB corrigeert de gegevens van een stembureau met resultaten uit een vorige zitting.  
2. De applicatie laat niet toe dat het nummer van het stembureau wordt aangepast.  
3. De applicatie slaat de gecorrigeerde stembureaugegevens op, alleen voor de huidige zitting.  
4. De coördinator GSB voert een verklaring voor de wijziging in.  
5. De applicatie neemt de verklaring op in het PV Na 14-2.  


__Uitbreidingen op hoofdscenario 1:__  
1a. De fout zit in het nummer van het stembureau:  
&emsp; 1a1. De coördinator GSB voert een vermelding van de fout in de applicatie in.  
&emsp; 1c2. De applicatie neemt de verklaring op in het PV Na 14-2.  


__Hoofdscenario 2:__
1. De coördinator GSB corrigeert de gegevens van een stembureau dat voor de huidige zitting is aangemaakt.

__Uitbreidingen op hoofdscenario 2:__  
1a. Het stembureau was foutievelijk aangemaakt:  
&emsp; 1a1. De coördinator GSB verwijdert het stembureau.


## Het GSB behandelt een verzoek tot onderzoek/hertelling (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het GSB voert het onderzoek uit.
2. Het GSB noteert de bevindingen op het corrigendum (DSO: Na 14-1 versie 2, CSO: Na 14-2 Bijlage 1).
3. Het GSB besluit dat er een hertelling nodig is.
4. Het GSB stelt een ander resultaat vast in de hertelling.
5. De coördinator voert de uitkomst van het onderzoek in de applicatie in.
6. De invoerders voeren de hertelling in de applicatie in volgens de systematiek die voor de eerste invoer wordt gebruikt.
7. Het GSB voegt het corrigendum (DSO: Na 14-1 versie 2, CSO: Na 14-2 Bijlage 1) toe aan de PV's van de zitting.

__Uitbreidingen:__  

3a. Het GSB besluit dat er geen hertelling nodig is:  
&emsp; 3a1. De coördinator GSB voert de uitkomst van het onderzoek in de applicatie in.  
&emsp; 3a2. Het GSB voegt het corrigendum toe aan de PV's van de zitting.  

4a. Het GSB bevestigt het oorspronkelijke resultaat in de hertelling:  
&emsp; 4a1. De coördinator GSB voert de uitkomst van het onderzoek in de applicatie in.  
&emsp; 4a2. Het GSB voegt het corrigendum (DSO: Na 14-1 versie 2, CSO: Na 14-2 Bijlage 1) toe aan de PV's van de zitting.  

6a. Tijdens invoer is er reden om de invoer (tijdelijk) te stoppen:  
&emsp; 6a1. De coördinator GSB pauzeert de invoer.  
&emsp; 6a2. De applicatie blokkeert verdere invoer.  

## De coördinator GSB maakt het PV P 2a en evt. het PV Na 14-2 en tellingsbestand EML 510b aan (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De applicatie stelt vast dat de bevindingen voor alle onderzoeken zijn ingevoerd en dat alle onderzochte stembureaus met gecorrigeerde telresultaten definitieve invoer hebben.
2. De coördinator GSB sluit de invoerfase af.
3. De coördinator GSB genereert de PVs: P 2a (Verslag volgende zitting) & Na 14-2 (Corrigendum GSB) en het EML-bestand Telling 510b.

__Uitbreidingen:__

3a. De applicatie stelt vast dat er geen onderzochte stembureaus met gecorrigeerde telresultaten zijn:  
&emsp; 3a1. De applicatie genereert alleen het PV P 2a (Verslag volgende zitting).
