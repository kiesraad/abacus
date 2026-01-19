# GSB: Eerste zitting

## Gemeentelijk stembureau (GSB) stelt uitkomst vast in eerste zitting (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. Het GSB opent de zitting.
2. (gedurende de zitting) Het GSB houdt tijd en locatie bij van de aanwezigheid van elk lid van het GSB.
3. Voor elk stembureau:
    - (CSO) Het GSB doet de telling op lijst- en kandidaatsniveau en vult Na 31-2 Bijlage 1 in.
    - (DSO) Het GSB stelt vast dat de tellingen die het stembureau heeft vastgesteld in N 10-1, kloppen.
4. De coördinator GSB stelt vast dat de verkiezing volledig en correct is aangemaakt.
5. [De coördinator GSB en de invoerders voeren alle gegevens in de applicatie in.](gsb-invoer.md#de-coördinator-gsb-en-de-invoerders-voeren-alle-gegevens-in-de-applicatie-in-vlieger)
6. [De coördinator GSB maakt het PV (DSO: Na 31-1, CSO: Na 31-2) en het tellingsbestand EML 510b aan.](#de-coördinator-gsb-maakt-het-pv-dso-na-31-1-cso-na-31-2-en-het-tellingsbestand-eml-510b-aan-zee)
7. Het GSB voert het controleprotocol (handmatige controle optellingen software) uit en stelt geen verschillen vast.
8. Het GSB stelt de gemeentelijke totalen vast o.b.v. het PV (DSO: Na 31-1, CSO: Na 31-2): controleren op compleetheid,
   voorlezen, geen additionele bezwaren en bijzonderheden, ondertekenen. En sluit daarmee de zitting.
9. Het GSB stelt het tellingsbestand EML 510b beschikbaar aan het CSB voor de uitslagvaststelling.
10. Het GSB stelt het PV GSB incl. bijlagen (DSO: Na 31-1, CSO: Na 31-2) beschikbaar aan de burgemeester.
11. De burgemeester publiceert het PV GSB incl. bijlagen (DSO: Na 31-1, CSO: Na 31-2) en brengt het over naar het CSB.

__Uitbreidingen:__

3b. (DSO) Het GSB stelt vast dat de tellingen van het stembureau mogelijk niet kloppen:  
&emsp; 3b1. Het GSB doet een (gedeeltelijke) hertelling van het stembureau.  
&emsp; 3b1. Het GSB noteert de wijzigingen in een corrigendum Na 14-1.

4a. De coördinator GSB ziet een fout in de aangemaakte stembureaus:  
&emsp; 4a1. De coördinator GSB of de beheerder past de stembureaus aan.

4b. De coördinator GSB ziet een fout in het aantal kiesgerechtigden:  
&emsp; 4b1. De coördinator GSB of de beheerder past het aantal kiesgerechtigden aan.

5a. (CSO) Er moeten hertellingen uitgevoerd worden vanwege foutmeldingen en/of waarschuwingen:  
&emsp; 5b1. Het GSB voert de hertelling uit.  
&emsp; 5b2. Het GSB corrigeert de Na 31-2 Bijlage 1 of vult een nieuwe Na 31-2 Bijlage 1 in.  
&emsp; 5b3. Het GSB voert de gecorrigeerde/nieuwe Na 31-2 Bijlage 1 in de applicatie in.

5b. (DSO) Er zijn controles op de telresultaten van het stembureau uitgevoerd:  
&emsp; 5c1. Het GSB vult het inlegvel "Controles en correcties" in.  
&emsp; 5c2. Het GSB voegt het inlegvel toe aan het proces-verbaal N 10-1.

7a. Het GSB stelt verschillen vast d.m.v. het controleprotocol (handmatige controle optellingen software):  
&emsp; 7a1. Het GSB controleert de resultaten van het controleprotocol.  
&emsp; 7a2. Het GSB vindt een fout in de resultaten van het controleprotocol en corrigeert deze.  
&emsp;&emsp; 7a2a. Het GSB vindt geen fout en bevestigt een verschil tussen de controles en de resultaten van de
applicatie:  
&emsp;&emsp;&emsp; 7a2a1. Het GSB neemt contact op met de Kiesraad.

8a. Het GSB stelt een probleem vast met het PV:  
&emsp; 8a1. Het GSB stelt het bezwaar vast.  
&emsp; 8a2. Het GSB gaat over tot hertelling. (zie uitbreiding 4b)

8b. Er zijn bezwaren en/of bijzonderheden tijdens het voorlezen van het PV:  
&emsp; 8b1. Het GSB voegt de bijzonderheden en/of bezwaren met de hand toe aan het papieren PV.

### Niet in scope

- "7a1. Het GSB stelt het bezwaar vast." Wat gebeurt hier precies?
- CSO: Invullen van "Bijlage 2: Bezwaren van aanwezigen op stembureaus" in de applicatie. Wordt wel handmatig toegevoegd aan het geprinte PV door coördinator GSB.
- Gemeentes willen waarschijnlijk na de eerste zitting van het GSB de voorlopige zetelverdeling weten. Dit gaan we niet faciliteren in de applicatie.
- Invoeren van het resultaat controleprotocol (handmatige controle optellingen software). N.B. Als het controleprotocol verschillen oplevert, dan is er een probleem met het PV uit de applicatie en kan dat PV dus niet gebruikt worden.

### Open punten

- Moet de applicatie een preview van het te genereren PV tonen, zodat de coördinator GSB die kan controleren en eventuele fouten kan herstellen?
  - Preview: bestand genereren met "concept" in watermerk en in bestandsnaam.
  - Voor nu nog geen preview, maar alleen de zip download met het PV en het EML_NL-bestand

## De coördinator GSB bewerkt de stembureaus tijdens de eerste zitting (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario 1:__

1. De coördinator GSB verneemt dat een stembureau niet open is gegaan.
2. De coördinator GSB stelt vast dat het stembureau op de gepubliceerde lijst staat en in de applicatie staat.
3. De coördinator GSB verwijdert het stembureau.
4. De applicatie vraagt om een verklaring van de wijziging. Deze verklaring wordt opgenomen in het PV (DSO: Na 31-1, CSO: Na 31-2).

__Uitbreidingen:__

3a. De coördinator GSB verwijdert het laatste stembureau:  
&emsp; 3a1. Invoer is niet meer mogelijk, tot een nieuw stembureau is toegevoegd.  

__Hoofdscenario 2:__

1. De coördinator GSB stelt vast dat de stembureaus in de applicatie niet kloppen met de gepubliceerde lijst.
2. De coördinator GSB corrigeert de stembureaus in de applicatie.
3. De applicatie vraagt om een verklaring van de wijziging. Deze verklaring wordt opgenomen in het PV (DSO: Na 31-1, CSO: Na 31-2).

__Uitbreidingen:__

2a. De coördinator GSB verwijdert het laatste stembureau:  
&emsp; 2a1. Invoer is niet meer mogelijk, tot een nieuw stembureau is toegevoegd.  

### Niet in scope

- Het opnemen van andere bijzonderheden i.v.m. stembureaus in het proces-verbaal, bijv. stembureau dat halverwege de dag werd gesloten. Dit hoort in de bezwaren en bijzonderheden van dat betreffende stembureau.

## De coördinator GSB maakt het PV (DSO: Na 31-1, CSO: Na 31-2) en het tellingsbestand EML 510b aan (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De applicatie stelt vast dat alle stembureaus definitieve invoer hebben.
2. De coördinator GSB sluit de invoerfase af. 
3. De applicatie stelt vast dat de gegevens van de zitting zijn ingevuld.
4. De coördinator GSB genereert het PV (DSO: Na 31-1, CSO: Na 31-2) en het tellingsbestand (EML 510 b).
5. De coördinator GSB voegt "Bijlage 2: Bezwaren van aanwezigen op stembureaus" toe aan het PV.

__Uitbreidingen:__

3a. De gegevens van de zitting zijn nog niet ingevuld:  
&emsp; 3a1. De coördinator GSB voert de locatie, startdatum en starttijd van de zitting in.
