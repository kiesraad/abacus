# Uiterste use cases (GR)

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting (wolk)

_Niveau:_ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Trigger:__ dag na de verkiezingen

__Hoofdscenario CSO:__  

1. Het GSB opent de zitting.
2. (voor elk stembureau) Het GSB doet de telling op lijst- en kandidaatniveau per stembureau. (inc. bijlage 2 invullen)
3. (voor elk stembureau) Het GSB voert de tellingen bijlage 2 in de applicatie in. -> [Het GSB voert de PV's en eventuele SB corrigenda's (DSO) in de applicatie in.](./Invoer-eerste-zitting.md#het-gsb-voert-de-pvs-en-eventuele-sb-corrigendas-dso-in-de-applicatie-in-vlieger)
4. Het GSB genereert het concept-PV en het elektronisch bestand (EML_NL) in de applicatie: datum en locatie zitting, aanwezige leden, bezwaren van kiezers, onregelmatigheden of bijzonderheden, extra onderzoeken van het GSB (uit 3b).
5. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
6. Het GSB stelt de gemeentelijke totalen vast obv het concept-PV: controleren op compleetheid, voorlezen, eventuele bezwaren noteren, ondertekenen. En sluit daarmee de zitting.
7. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling. (elektronisch bestand)
   1. Wettelijke eis: "er vindt overdracht plaats". Dus ruimte in technische oplossing.
   2. Wat zeggen de voorschriften? overdracht of alle overdrachten?
   3. Randvoorwaarden: controle hash, er is een vormvrije overdracht, zo dicht mogelijk tegen de applicatie, ongeveer week tussen GSB en CSB, overdracht moet meermaals kunnen (nieuwe zitting GSB).

8. Het GSB stelt de benodigde bestanden beschikbaar aan de burgemeester. (PVs en stembescheiden, elektronisch bestand)

__Uitbreidingen CSO:__  
3a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

3b. Er moeten hertellingen uitgevoerd worden vanwege foutmeldingen en/of waarschuwingen:  
&emsp; 3b1: hertellen en invoeren bij "extra onderzoeken van het GSB"

5a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 5a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 5a2. Het GSB vindt een fout en corrigeert de resultaten van het controleprotocol.  
&emsp;&emsp; 5a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 5a2a1. Het GSB neemt contact op met de Kiesraad.  

6a. Het GSB stelt een probleem vast met het PV:  
&emsp; 6a1. bezwaar -> hertelling -> opnieuw invoer stembureau(s)

#### Open punten CSO

- wat zit er allemaal in het elektronisch bestand
- hoe ziet de overdracht van het elektronisch bestand van GSB naar CSB er precies uit?



__Hoofdscenario DSO:__  (te doen)

1. Het GSB opent de zitting.
2. (voor elk stembureau) Het GSB stelt de uitslag van een stembureau vast.
3. (voor elk stembureau) [Het GSB voert de PV's en eventuele SB corrigenda's (DSO) in de applicatie in.](./Invoer-eerste-zitting.md#het-gsb-voert-de-pvs-en-eventuele-sb-corrigendas-dso-in-de-applicatie-in-vlieger)
4. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
5. Het GSB sluit de zitting.
6. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__Uitbreidingen DSO:__  (te doen)
3a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

4a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 4a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 4a2. Het GSB vindt een fout en corrigeert de resultaten van het controleprotocol.  
&emsp;&emsp; 4a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 4a2a1. Het GSB neemt contact op met de Kiesraad.  


## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda) (wolk)

__Niveau:__ hoog-over, wolk, ☁️

Nog na te lopen.

### Hoofdscenario en uitbreidingen

__Trigger:__ één of meer stembureaus moeten herteld worden n.a.v. verzoek CSB

__Hoofdscenario:__  

1. Het GSB opent de zitting.
2. (voor elk te hertellen stembureau) Het GSB stelt de uitslag van een stembureau opnieuw vast.
3. (voor elk herteld stembureau met gewijzigde uitslag) [Het GSB voert de corrigendum PV's in de applicatie in.](./Invoer-tweede-zitting.md#het-gsb-voert-de-corrigendum-pvs-in-de-applicatie-in-vlieger)
4. Het GSB sluit de zitting.
5. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__Uitbreidingen:__
2a. Er zijn hertelde stembureaus met ongewijzigde uitslag:  
2b. Er zijn alleen hertelde stembureaus met ongewijzigde uitslag:  

### Open punten

- Hoe ziet de trigger voor hertelling er precies uit voor gemeenteraadsverkiezingen? Het GSB (dus de gemeente) stelt de telling op gemeente-niveau vast, het CSB (ook de gemeente) controleert die telling en verzoekt als nodig om onderzoek en/of hertelling?


## Centraal stembureau (CSB) stelt verkiezingsuitslag vast (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__  

1. Het CSB ontvangt het PV en de onderliggende PVs en de elektronische bestanden en de corrigenda van het GSB. Het CSB controleert ~~of ze het juiste bestand~~ wat ze hebben gekregen.
2. Het CSB stelt vast dat het PV geen aanleiding geeft tot een terugverwijzing. (controleprotocol deel A)
3. Het CSB leest het elektronisch bestand in als eerste invoer. (controle hashcode en import)
4. Het CSB voert de resultaten handmatig in als tweede invoer.
5. Het CSB voert het controleprotocol optellingen uit. (controleprotocol deel B)
6. De applicatie berekent de zetelverdeling. / wijst de zetels toe aan partijen.
7. De applicatie wijst de zetels toe aan kandidaten.  
8. De applicatie genereert de benodigde bestanden: concept-PV, digitaal bestand(en). Locatie en datum, namen stunbureauleden, bezwaren, opmerkelijkheden, ...?
9. De applicatie geneert de benoemingsbrieven en de kennisgevingen tot geloofsbrief. En voorzitter CSB (burgemeester) tekent de brieven.
10. Het CSB voert het controleprotocol zetelverdeling uit. (controleprotocol deel C)
11. Het CSB opent de zitting.
12. Het CSB stelt de uitslag vast obv het concept-PV: controleren op compleetheid, voorlezen, eventuele bezwaren noteren, ondertekenen. En sluit daarmee de zitting.
13. Het CSB publiceert het digitaal bestand en het PV op de website van de gemeente.
14. Het CSB stuurt alle PVs naar de gemeenteraad.
15. Het CSB deelt het digitaal bestand met de Kiesraad.



2a. Terugverwijzing -> wachten -> krijgen -> verder

3a. Geen import mogelijk -> handmatig (en/of eerst even checken met GSB)

4a. Er zijn verschillen tussen eerste en tweede invoer:

11a. Er zijn bezwaren (kan alleen tijdens zitting):

### Open punten

- Benoemingsbrieven en de kennisgevingen tot geloofsbrief niet uit Abacus, maar op andere manier gegenereerd?
- Willen gemeentes de layout bepalen van de benoemingsbrieven en de kennisgevingen tot geloofsbrief? (huisstijl!)
- Moet de applicatie ook de resultaten ter publicatie ook genereren?
