# GSB: Tweede zitting

N.B.: Alle use cases voor de tweede zitting gelden ook voor elke latere zitting (derde, etc.).

## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Trigger:__ één of meer stembureaus moeten herteld worden n.a.v. verzoek CSB

__Hoofdscenario:__  
1. Het GSB ontvangt één of meerdere verzoeken tot onderzoek/hertelling van het CSB.
2. Het GSB opent de zitting. (Wanneer dat gebeurt is een afweging van het GSB: liefst pas als alle verzoeken binnen zijn, maar ook niet te lang wachten)
3. De coördinator GSB geeft in de applicatie aan dat de zitting is geopend. Hiermee wordt de vorige zitting in de applicatie gesloten.
4. (voor elk verzoek) [Het GSB behandelt een verzoek tot onderzoek/hertelling.](#het-gsb-behandelt-een-verzoek-tot-onderzoekhertelling-vlieger)
5. De coördinator GSB maakt de GSB PVs en het EML_NL-bestand aan: P 2a (verslag tweede zitting), Na 14-2 (corrigendum GSB).
6. Het GSB voert de andere onderdelen van het GSB-corrigendum in.
7. Het GSB leest de PV's voor: P 2a (verslag tweede zitting), Na 14-2 (corrigendum GSB), Na 14-1 versie 2 (DSO, één per SB) of Na 14-2 Bijlage 1 (CSO, één bijlage per SB).
8. Het GSB ondertekent de PV's.
9. Het GSB sluit de zitting.
10. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

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



## Het GSB behandelt een verzoek tot onderzoek/hertelling (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. De coördinator GSB selecteert een stembureau en voert "Aanleiding van het onderzoek" (vrije tekst) in de applicatie in.
2. De applicatie genereert een 'leeg' corrigendum, Na 14-1 versie 2 (DSO) of Bijlage 1 van Na 14-2 (CSO). ('leeg' == klaar om in te vullen: kandidatenlijst, oorspr. tellingen, verzoek CSB (aanleiding))
3. De coördinator GSB drukt het eerste blad van het 'lege' corrigendum af.
4. Het GSB voert het onderzoek uit.
5. Het GSB noteert de bevindingen op het corrigendum.
6. Het GSB besluit dat er een hertelling nodig is.
7. De coördinator GSB drukt de overige bladzijdes van het 'leeg' corrigendum af.
8. Het GSB stelt een ander resultaat vast in de hertelling.
9. [De invoerders voeren de uitkomst van het onderzoek en de hertelling in de applicatie in.](./gsb-invoer-tweede-zitting.md#de-invoerders-voeren-de-uitkomst-van-het-onderzoek-en-de-hertelling-in-de-applicatie-in-vlieger)
11. Het GSB voegt het corrigendum toe aan de PV's van de zitting.


__Uitbreidingen:__  
1a. Het GSB besluit om n.a.v. een verzoek additionele stembureaus te onderzoeken:  
&emsp; 1a1. De coördinator GSB selecteert een stembureau en voert "Aanleiding van het onderzoek" (vrije tekst) in de applicatie in.

3a. De coördinator GSB drukt het hele corrigendum af:  

6a. Het GSB besluit dat er geen hertelling nodig is:  
&emsp; 6a1. De coördinator GSB voert de uitkomst van het onderzoek in de applicatie in.  
&emsp; 6a2. De coördinator GSB gooit het corrigendum weg.

8a. Het GSB bevestigt het oorspronkelijke resultaat in de hertelling:  
&emsp; 8a1. De coördinator GSB voert de uitkomst van het onderzoek in de applicatie in.  
&emsp; 8a2. De coördinator GSB gooit het corrigendum weg.


### Open punten

- 'leeg' corrigendum is geen heel goede term
    - Moet je kunnen selecteren welke lijsten er opgenomen moeten worden in het 'lege' corrigendum? Nee, want nieuwe modellen: corrigendum bevat aantallen modellen vorige zitting (niet: eerste zitting tenzij dat de vorige zitting is), dus handig om alle lijsten in corrigendum te hebben.
- Hoe expliciet willen we zijn over de verschillende momenten waarop welke onderdelen van het corrigendum afgedrukt kunnen worden?
