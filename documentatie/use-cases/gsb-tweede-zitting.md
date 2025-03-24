# GSB: Tweede zitting

## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Trigger:__ één of meer stembureaus moeten herteld worden n.a.v. verzoek CSB

__Hoofdscenario:__  

TODO: 3-5 naar use case(s) op lager niveau

1. Het GSB ontvangt één of meerdere verzoeken tot onderzoek/hertelling van het CSB.
2. Het GSB opent de zitting. (Wanneer dat gebeurt is een afweging van het GSB: liefst pas als alle verzoeken binnen zijn, maar ook niet te lang wachten)
3. [Het GSB behandelt een verzoek tot onderzoek/hertelling.](#het-gsb-behandelt-een-verzoek-tot-onderzoekhertelling-vlieger)
4. (voor elk herteld stembureau met gewijzigde uitslag) [Het GSB voert de corrigendum PV's in de applicatie in.](./gsb-invoer-tweede-zitting.md#het-gsb-voert-de-corrigendum-pvs-in-de-applicatie-in-vlieger)
5. Het GSB voert de andere onderdelen van het GSB-corrigendum in.
6. Het GSB leest voor en controleert Na 14-2 (corrigendum op GSB eerste zitting) en de P 2a (verslag tweede zitting).
7. Het GSB sluit de zitting.
8. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__Uitbreidingen:__

3-5. Het GSB schorst de zitting, omdat er mogelijk nog een verzoek komt.

6a. Het GSB stelt een probleem vast met het PV:  
&emsp; 6a1. Het GSB stelt het bezwaar vast.  
&emsp; 6a2. Het GSB gaat over tot hertelling.

### Open punten

- Waar komt het lege corrigendum dat moet worden ingevuld, vandaan?
- Maakt het voor de tweede zitting uit of een gemeente DSO of CSO doet?
- Hoe ziet de trigger voor hertelling er precies uit voor gemeenteraadsverkiezingen? Het GSB (dus de gemeente) stelt de telling op gemeente-niveau vast, het CSB (ook de gemeente) controleert die telling en verzoekt als nodig om onderzoek en/of hertelling?
- Verschil CSO/DSO: modellen. Dus hopelijk mogelijk zelfde use case.


## Het GSB behandelt een verzoek tot onderzoek/hertelling (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. De coördinator GSB voert het verzoek in de applicatie in.
2. De applicatie genereert een 'leeg' corrigendum, Na 14-1 (DSO). ('leeg' == klaar om in te vullen: kandidatenlijst, oorspr. tellingen, verzoek CSB (aanleiding))
3. Het GSB voert het onderzoek / de hertelling uit.
4. Het GSB noteert de bevindingen op het corrigendum.
5. ~~Het GSB besluit dat er geen hertelling nodig is.~~
6. Het GSB zorgt ervoor dat de bevindingen in het PV P 2a worden opgenomen.
7. Het GSB gooit het corrigendum Na 14-1 (DSO) weg.

TODO:
- onderzoek leidt tot (1) onderzoek geen hertelling; (2) onderzoek, hertelling, zelfde uitslag; (3) onderzoek, hertelling, andere uitslag
    - alleen bij (3) wordt het corrigendum (en de bevindingen) behouden, bij de rest alleen de bevindingen
    - bij (1) druk je geen 'leeg' corrigendum af, !staat nu wel in de use cases dat je wel afdrukt => op zijn minst eerste pagina nodig bij de nieuwe modellen

__Uitbreidingen:__

5a. Het GSB besluit dat een hertelling nodig is:  
&emsp; 5a1. Het GSB stelt de uitslag van het stembureau opnieuw vast.
&emsp; 5a2. Het GSB vult de nieuwe uitslag in op het corrigendum Na 14-1 (DSO).

### Open punten

- Hoe ziet een verzoek eruit? vrije tekst
- modellen verschillen DSO/CSO
- 'leeg' corrigendum is geen heel goede term
    - Moet je kunnen selecteren welke lijsten er opgenomen moeten worden in het 'lege' corrigendum? Nee, want nieuwe modellen: corrigendum bevat aantallen modellen vorige zitting (niet: eerste zitting tenzij dat de vorige zitting is), dus handig om alle lijsten in corrigendum te hebben.
- Hoe zorgt het GSB ervoor dat de bevindingen in het PV P 2a worden opgenomen?
- Wat als bij hertelling de uitslag ongewijzigd is ten opzichte van de oorspronkelijke telling? Wat als dit het geval is voor al de hertelde stembureaus?
