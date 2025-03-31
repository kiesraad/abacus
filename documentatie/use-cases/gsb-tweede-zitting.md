# GSB: Tweede zitting

## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Trigger:__ één of meer stembureaus moeten herteld worden n.a.v. verzoek CSB

__Hoofdscenario:__  
1. Het GSB ontvangt één of meerdere verzoeken tot onderzoek/hertelling van het CSB.
2. Het GSB opent de zitting. (Wanneer dat gebeurt is een afweging van het GSB: liefst pas als alle verzoeken binnen zijn, maar ook niet te lang wachten)
3. De coördinator GSB opent de zitting in de applicatie.
4. (voor elk verzoek) [Het GSB behandelt een verzoek tot onderzoek/hertelling.](#het-gsb-behandelt-een-verzoek-tot-onderzoekhertelling-vlieger)
5. Het GSB voert de andere onderdelen van het GSB-corrigendum in.
6. Het GSB leest voor en controleert Na 14-2 (corrigendum op GSB eerste zitting) en de P 2a (verslag tweede zitting).
7. Het GSB sluit de zitting.
8. De coördinator GSB sluit de zitting in de applicatie.
9. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__Uitbreidingen:__

3a. Er is al een open zitting:  
&emsp; 3a1. De applicatie toont een foutmelding en opent geen nieuwe zitting.

3b. De coördinator GSB opent per ongeluk de zitting in de applicatie:  
&emsp; 3b1. De coördinator GSB verwijdert de geopende zitting.  
&emsp;&emsp; 3b1a. Er is al invoer voor de geopende zitting:  
&emsp;&emsp;&emsp; 3b1a1. De applicatie toont een foutmelding en verwijdert de geopende zitting niet.

3c. Er is geen eerste zitting in de applicatie:  
&emsp; 3c1. De coördinator importeert het EML_NL bestand van de eerste zitting.

4-6a. Het GSB schorst de zitting, omdat er mogelijk nog een verzoek komt:

6a. Het GSB stelt een probleem vast met het PV:  
&emsp; 6a1. Het GSB stelt het bezwaar vast.  
&emsp; 6a2. Het GSB gaat over tot hertelling.

### Open punten

- Is er een verschil tussen hoe een derde/vierde/.. zitting loopt en de tweede zitting?
- Maakt het voor de tweede zitting uit of een gemeente DSO of CSO doet?
- Hoe ziet de trigger voor hertelling er precies uit voor gemeenteraadsverkiezingen? Het GSB (dus de gemeente) stelt de telling op gemeente-niveau vast, het CSB (ook de gemeente) controleert die telling en verzoekt als nodig om onderzoek en/of hertelling?
- Verschil CSO/DSO: modellen. Dus hopelijk mogelijk zelfde use case.
- Is er een Na 14-2 (corrigendum op GSB eerste zitting) als er geen hertellingen met een ander resultaat uit de onderzoeken komen?


## Het GSB behandelt een verzoek tot onderzoek/hertelling (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. De coördinator GSB voert het verzoek (vrije tekst) in de applicatie in.
2. De applicatie genereert een 'leeg' corrigendum, Na 14-1 (DSO). ('leeg' == klaar om in te vullen: kandidatenlijst, oorspr. tellingen, verzoek CSB (aanleiding))
3. De coördinator drukt het eerste blad van het 'lege' corrigendum af.
4. Het GSB voert het onderzoek uit.
5. Het GSB noteert de bevindingen op het corrigendum.
6. Het GSB besluit dat er een hertelling nodig is.
7. De coördinator GSB drukt de overige bladzijdes van het 'leeg' corrigendum af.
8. Het GSB stelt een ander resultaat vast in de hertelling.
9. [Het GSB voert de hertelling in de applicatie in.](./gsb-invoer-tweede-zitting.md#het-gsb-voert-de-corrigendum-pvs-in-de-applicatie-in-vlieger)

__Uitbreidingen:__  
6a. Het GSB besluit dat er geen hertelling nodig is:  
&emsp; 6a1. Het GSB zorgt ervoor dat de bevindingen in het PV P 2a worden opgenomen.  
&emsp; 6a2. Het GSB gooit het eerste blad van het 'lege' corrigendum weg.

8a. Het GSB bevestigt het oorspronkelijke resultaat in de hertelling:  
&emsp; 8a1. Het GSB zorgt ervoor dat de bevindingen in het PV P 2a worden opgenomen.  
&emsp; 8a2. Het GSB gooit het corrigendum met de hertelling weg.


### Open punten

- modellen verschillen DSO/CSO
- 'leeg' corrigendum is geen heel goede term
    - Moet je kunnen selecteren welke lijsten er opgenomen moeten worden in het 'lege' corrigendum? Nee, want nieuwe modellen: corrigendum bevat aantallen modellen vorige zitting (niet: eerste zitting tenzij dat de vorige zitting is), dus handig om alle lijsten in corrigendum te hebben.
- Hoe zorgt het GSB ervoor dat de bevindingen in het PV P 2a worden opgenomen?
- Is het mogelijk dat er een hertelling wordt uitgevoerd voor een stembureau waar geen verzoek voor is ingediend? Heeft mogelijk gevolgen voor welke stembureaus we toestaan dat er een corrigendum wordt ingevoerd.
