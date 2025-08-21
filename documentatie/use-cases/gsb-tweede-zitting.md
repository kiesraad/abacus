# GSB: Tweede zitting

N.B.: Alle use cases voor de tweede zitting gelden ook voor elke latere zitting (derde, etc.).

## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Trigger:__ één of meer stembureaus moeten herteld worden n.a.v. verzoek CSB

__Hoofdscenario:__  
1. Het GSB ontvangt één of meerdere verzoeken tot onderzoek/hertelling van het CSB.
2. [De coördinator GSB bereidt de documenten voor de zitting voor.](#de-coördinator-gsb-bereidt-de-documenten-voor-de-zitting-voor-zee)
3. Het GSB opent de zitting. (Wanneer dat gebeurt is een afweging van het GSB: liefst pas als alle verzoeken binnen zijn, maar ook niet te lang wachten)
4. De coördinator GSB geeft in de applicatie aan dat de zitting is geopend en voert de locatie en starttijd in. Hiermee wordt de vorige zitting in de applicatie gesloten.
5. (voor elk verzoek) [Het GSB behandelt een verzoek tot onderzoek/hertelling.](#het-gsb-behandelt-een-verzoek-tot-onderzoekhertelling-vlieger)
6. De coördinator GSB maakt de GSB PVs en het EML_NL-bestand aan: P 2a (verslag tweede zitting), Na 14-2 (corrigendum GSB).
7. Het GSB voert de andere onderdelen van het GSB-corrigendum in.
8. Het GSB leest de PV's voor: P 2a (verslag tweede zitting), Na 14-2 (corrigendum GSB), Na 14-1 versie 2 (DSO, één per SB) of Na 14-2 Bijlage 1 (CSO, één bijlage per SB).
9. Het GSB ondertekent de PV's.
10. Het GSB sluit de zitting.
11. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__Uitbreidingen:__

3a. Er is al een open zitting:  
&emsp; 3a1. De applicatie opent geen nieuwe zitting.

3b. De coördinator GSB opent per ongeluk de zitting in de applicatie:  
&emsp; 3b1. De coördinator GSB verwijdert de geopende zitting.  
&emsp;&emsp; 3b1a. Er is al invoer voor de geopende zitting:  
&emsp;&emsp;&emsp; 3b1a1. De applicatie verwijdert de geopende zitting niet.

3c. Er is geen eerste zitting in de applicatie:  
&emsp; 3c1. De coördinator importeert het EML_NL bestand van de eerste zitting.

4-7a. Het GSB schorst de zitting, omdat er mogelijk nog een verzoek komt:

7a. Het GSB stelt een probleem vast met het PV:  
&emsp; 7a1. Het GSB stelt het bezwaar vast.  
&emsp; 7a2. Het GSB gaat over tot hertelling.


## De coördinator GSB bereidt de documenten voor de zitting voor (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. De coördinator GSB selecteert een stembureau en voert "Aanleiding van het onderzoek" (vrije tekst) in de applicatie in.
2. De applicatie genereert een 'leeg' corrigendum, Na 14-1 versie 2 (DSO) of Bijlage 1 van Na 14-2 (CSO). ('leeg' == klaar om in te vullen: kandidatenlijst, oorspr. tellingen, verzoek CSB (aanleiding))
3. De coördinator GSB drukt het 'lege' corrigendum af.

__Uitbreidingen:__  

1a. Het GSB besluit om n.a.v. een verzoek additionele stembureaus te onderzoeken:  
&emsp; 1a1. De coördinator GSB selecteert een stembureau en voert "Aanleiding van het onderzoek" (vrije tekst) in de applicatie in.  

1b. De coördinator GSB ontdekt dat een stembureau dat op de vooraf gepubliceerde lijst staat niet in Abacus is opgenomen:  
&emsp; 1b1. De coördinator GSB voegt het stembureau toe.  
&emsp; 1b2. Abacus maakt melding op het PV dat het stembureau is toegevoegd.  
&emsp; 1b3. Het corrigendum corrigeert het aantal stemmen bij dit stembureau van 0 naar het werkelijke aantal.  

1c. De coördinator GSB ontdekt dat het nummer van een stembureau niet correct in Abacus is opgenomen:  
&emsp; 1c1. De coördinator zorgt dat de fout vermeld wordt in het PV.

1d. De coördinator GSB ontdekt dat de gegevens van een stembureau niet correct in Abacus zijn opgenomen:  
&emsp; 1d1. De applicatie laat niet toe dat het nummer van het stembureau wordt aangepast.  
&emsp; 1d2. De coördinator GSB corrigeert de stembureaugegevens.  
&emsp; 1d3. De applicatie slaat de gecorrigeerde stembureaugegevens op, alleen voor de huidige zitting.  
&emsp; 1d4. De coördinator GSB zorgt dat de correctie vermeld wordt in het PV.  

1e. De coördinator GSB ontdekt dat een stembureau ten onrechte is meegenomen in een eerdere zitting:  
&emsp; 1e1. Het GSB maakt een corrigendum naar 0 stemmen voor dit stembureau.  


## Het GSB behandelt een verzoek tot onderzoek/hertelling (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het GSB voert het onderzoek uit.
2. Het GSB noteert de bevindingen op het corrigendum.
3. Het GSB besluit dat er een hertelling nodig is.
4. Het GSB stelt een ander resultaat vast in de hertelling.
5. De coördinator voert de uitkomst van het onderzoek in de applicatie in.
6. De invoerders voeren de hertelling in de applicatie in volgens de systematiek die voor de eerste invoer wordt gebruikt.
7. Het GSB voegt het corrigendum toe aan de PV's van de zitting.

__Uitbreidingen:__  

3a. Het GSB besluit dat er geen hertelling nodig is:  
&emsp; 3a1. De coördinator GSB voert de uitkomst van het onderzoek in de applicatie in.  
&emsp; 3a2. Het GSB voegt het corrigendum toe aan de PV's van de zitting.  

4a. Het GSB bevestigt het oorspronkelijke resultaat in de hertelling:  
&emsp; 4a1. De coördinator GSB voert de uitkomst van het onderzoek in de applicatie in.  
&emsp; 4a2. Het GSB voegt het corrigendum toe aan de PV's van de zitting.  
