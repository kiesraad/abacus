# GSB - Uiterste use cases

## Gemeentelijk stembureau (GSB) stelt uitslag vast in eerste zitting

_niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__trigger:__ dag na de verkiezingen

__hoofdscenario__:  

1. Het GSB opent de zitting.
2. (voor elk stembureau) Het GSB stelt de uitslag van een stembureau vast.
3. (voor elk stembureau) [Het GSB voert de PV's en eventuele SB corrigenda's (DSO) in de applicatie in.](./GSB-hoogover.md#het-gsb-voert-de-pvs-en-eventuele-sb-corrigendas-dso-in-de-applicatie-in)
4. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
5. Het GSB sluit de zitting.
6. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__uitbreidingen__:  
3a. De eerste invoer in de applicatie is gebruikt om verschillende optellingen te controleren:  

4a. Het GSB stelt verschillen vast dmv het controleprotocol (handmatige controle optellingen software):  
&emsp; 4a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 4a2. Het GSB vindt een fout en corrigeert de resultaten van het controleprotocol.  
&emsp;&emsp; 4a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de applicatie:  
&emsp;&emsp;&emsp; 4a2a1. Het GSB neemt contact op met de Kiesraad.  

## Gemeentelijk stembureau (GSB) stelt uitslag vast in tweede zitting (corrigenda)

__niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__trigger:__ één of meer stembureaus moeten herteld worden nav verzoek CSB

__hoofdscenario__:  

1. Het GSB opent de zitting.
2. (voor elk te hertellen stembureau) Het GSB stelt de uitslag van een stembureau opnieuw vast.
3. (voor elk herteld stembureau met gewijzigde uitslag) [Het GSB voert de corrigendum PV's in de applicatie in.](./GSB-hoogover.md#het-gsb-voert-de-corrigendum-pvs-in-de-applicatie-in)
4. Het GSB sluit de zitting.
5. Het GSB stelt de benodigde bestanden beschikbaar aan het CSB voor de uitslagvaststelling.

__uitbreidingen__:
2a. Er zijn hertelde stembureaus met ongewijzigde uitslag:  
2b. Er zijn alleen hertelde stembureaus met ongewijzigde uitslag:  

### Open punten

- Hoe ziet de trigger voor hertelling er precies uit voor gemeenteraadskverkiezingen? Het GSB (dus de gemeente) stelt de telling op gemeente-niveau vast, het CSB (ook de gemeente) controleert die telling en verzoekt als nodig om onderzoek en/of hertelling?

---

## Centraal stembureau (CSB) stelt verkiezingsuitslag vast ☁️

__niveau:__ hoog-over, wolk

### Hoofdscenario en uitbreidingen

__hoofdscenario__:  

1. De applicatie berekent de zetelverdeling.  
2. De applicatie wijst de zetels toe.  
3. De applicatie genereert de benodigde bestanden.  
4. Het CSB voert het controleprotocol uit.
5. Het CSB stelt de verkiezingsuitslag vast in de CSB-zitting.
6. De gemeente publiceert de resultaten.
