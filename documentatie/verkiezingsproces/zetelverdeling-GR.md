# Zetelverdeling en aanwijzing kandidaten bij gemeenteraadsverkiezingen

In dit document staat beschreven hoe de zetelverdeling en de aanwijzing van gekozen kandidaten werkt bij gemeenteraadsverkiezingen.

## Verschillen in proces o.b.v. aantal raadszetels

Op twee punten zijn er verschillen in het proces op basis van het aantal raadszetels waar de verkiezing over gaat:

- A. Zetelverdeling: 3. toedelen restzetels (\>= 19 vs < 19 raadszetels)
- B. Aanwijzing gekozen kandidaten: 1. vaststellen voorkeursdrempel (\>= 19 vs < 19 raadszetels)

Op alle overige punten is het proces gelijk.

## Context

Het aantal zetels is minimaal 9 en maximaal 45. Het aantal zetels is altijd oneven. Gemeentes met 20.000 of minder inwoners hebben minder dan 19 zetels. (Gemeentewet artikel 8)

Van de 342 gemeentes in Nederland hebben er iets minder dan 20% minder dan 19 zetels. ([bron](https://allecijfers.nl/ranglijst/grootste-en-kleinste-gemeenten-in-inwoners-in-nederland/))

Het maximaal mogelijke aantal restzetels is het aantal lijsten - 1. De restzetels komen namelijk uit het getal achter de komma voor elke lijst bij de verdeling van de volle zetels. Dus het maximale mogelijke aantal restzetels is de som van een reeks getallen die als lengte het aantal lijsten heeft en als maximale waarde voor elk getal in de reeks een getal kleiner dan 1.

Bij minder dan 19 zetels zijn er voor de restzetels mogelijk drie rondes: grootste overschotten, grootste gemiddelden (max 1 restzetel per lijst), grootste gemiddelden (meerdere restzetels per lijst toegestaan). Die derde ronde kan alleen gebeuren bij lijstuitputting. In de tweede ronde komt namelijk elke lijst in aanmerking voor een restzetel en het maximaal mogelijke aantal restzetels is het aantal partijen - 1. Dus zonder lijstuitputting worden alle restzetels ten laatste in die tweede ronde toegekend.

In de gemeenteraadsverkiezingen van 2014 t/m 2024 zijn bij alle gemeentes met minder dan 19 zetels alle restzetels toegekend o.b.v. grootse overschotten. Er waren dus altijd meer partijen die minstens 75% van de kiesdeler haalden, dan dat er restzetels toe te wijzen waren. Er moest dus niet overgegaan worden op het stelsel van grootste gemiddelden na het toepassen van grootste overschotten.

---

## A. zetelverdeling

Het resultaat van delingen is een breuk, niet een decimaal.

### 1. Vaststelling van het totale aantal uitgebrachte stemmen en berekening van de kiesdeler (art P 5)

- Het totale aantal uitgebrachte stemmen is de som van de stemtotalen van alle lijsten (dus __niet__ blanco of ongeldige stemmen).
- Kiesdeler = som van de stemtotalen van alle lijsten / aantal te verdelen zetels

### 2. Toedeling van zetels op basis van het behalen van de kiesdeler (eerste toedeling) (art P 6)

- Aantal zetels = floor(stemtotaal lijst / kiesdeler)

### 3. Toedeling van restzetels

- Bij \>= 19 raadszetels (art P 7): stelsel van grootste gemiddelden
- Bij < 19 raadszetels (art P 8): eerst stelsel van grootste overschotten, dan stelsel van grootste gemiddelden
  - Stelsel van grootste gemiddelden wordt als nodig twee keer toegepast: eerste keer maximaal één restzetel per lijst, tweede keer vervalt die beperking

#### Stelsel grootste overschotten

- Selecteer alle lijsten met \>= 75% van de kiesdeler aan stemmen
- Overschot = stemtotaal van lijst - (kiesdeler * aantal zetels van de lijst)
- Ken restzetels toe o.b.v. overschotten van hoog naar laag, dus maximaal één zetel per partij
- Bij gelijke overschotten van lijsten en minder restzetels dan lijsten met gelijk overschot: loting in zitting CSB

#### Stelsel grootste gemiddelden

- Selecteer alle lijsten (inc. lijsten zonder zetels)
- Gemiddelde = stemtotaal van lijst / (aantal reeds toegekende zetels + 1)
  - Gemiddelde is hier het gemiddeld aantal stemmen per toegewezen zetel
  - Voor het berekenen van dit gemiddelde wordt het aantal zetels van een lijst genomen inc. de eventueel toegewezen restzetel
- Ken de eerste restzetel toe aan de lijst met het hoogste gemiddelde
- Herbereken het gemiddelde van de lijst die de restzetel kreeg (dus + 2 i.p.v. + 1)
- Ken alle volgende restzetels op dezelfde wijze toe
- Een lijst kan dus meerdere restzetels toegekend krijgen
  - Bij \>= 19 zetels altijd (er is maar één ronde)
  - Bij < 19 zetels niet in de eerste ronde, wel in een tweede ronde als er nog restzetels te verdelen zijn
- Bij gelijke gemiddelden van lijsten en minder restzetels dan lijsten met gelijk gemiddelde: loting in de zitting van het CSB

### 4. Wijziging van de zetelverdeling indien een lijst de volstrekte meerderheid van stemmen behaalt (art P 9)

- Als een lijst wel volstrekte meerderheid aan stemmen heeft, maar niet volstrekte meerderheid aan zetels, dan een extra zetel
- Een volstrekte meerderheid van stemmen en zetels wordt berekend als 50% + 1 (bij even totaal) of 50% + ½ (bij oneven totaal)
- De zetel wordt afgenomen van de lijst waaraan de laatste restzetel is toegekend
  - Als twee of meer lijsten voor hetzelfde gemiddelde of overschot de laatste restzetels hebben gekregen, dan wordt in de zitting van het CSB door loting bepaald welke van die partijen een zetel af moet geven
  - Sectie 2.4.6 van "Determination of the Election Results" toont aan dat de laatste restzetel nooit van de partij met volstrekte meerderheid aan stemmen kan komen


### 5. Wijziging van de zetelverdeling in geval van uitputting van lijsten (art P 10)

Als in één van bovenstaande stappen meer zetels aan een lijst toegewezen moeten worden dan er kandidaten zijn, dan worden die zetels aan overige partijen toegewezen conform de stap in het proces, en blijft de uitgeputte lijst verder buiten beschouwing voor de zetelverdeling.

---

## B. Aanwijzing van de gekozen kandidaten

Overleden kandidaten worden buiten beschouwing gelaten. (art P19a)

### 1. Aanwijzing van met voorkeurstemmen gekozen kandidaten (art P 15 en P 16)

- Stel voorkeursdrempel vast
  - \>= 19 raadszetels: 25% van kiesdeler
  - < 19 raadszetels: 50% van kiesdeler
- Selecteer kandidaten die voorkeursdrempel gehaald hebben
- Ken zetels toe op volgorde van aantal behaalde stemmen (tot aantal behaalde zetels van de lijst)
- Bij gelijke aantallen stemmen maar minder zetels: loting in zitting CSB

### 2. Aanwijzing van de overige gekozen kandidaten (art P 17)

- Resterende zetels toegekend o.b.v. volgorde in de lijst

### 3. Rangschikking van de kandidaten op de kandidatenlijsten (art P 19)

- Met het oog op het vervullen van vacatures: volgorde lijst wijzigen o.b.v. voorkeurstemmen
- Lijsten die in aanmerking komen voor rangschikking:
  - meer dan 19 zetels: lijsten (1) met minstens één zetel EN (2) waarop kandidaten aantal stemmen hebben behaald hoger dan 25% van de kiesdeler (voorkeurdrempel)
  - minder dan 19 zetels: lijsten waarop kandidaten aantal stemmen hebben behaald hoger dan 50% van de kiesdeler (voorkeurdrempel)
- Rangschikking
  - Eerst kandidaten die met voorkeurstemmen zijn gekozen, in volgorde waarin zetels toegewezen
  - Daarna kandidaten met stemmen hoger dan voorkeursdrempel maar geen zetel, in volgorde van aantal stemmen
  - Daarna overige kandidaten, in volgorde van lijst

---

## Referenties

- [Formele Beschrijving van de Berekening van de Zetelverdeling (versie 20-12-2024)](https://www.kiesraad.nl/adviezen-en-publicaties/formulieren/2016/osv/osv-bestanden/formele-beschrijving-van-de-berekening-van-de-zetelverdeling)
- [Determination of the Election Results (v7.3, 01-10-2020)](https://www.kiesraad.nl/adviezen-en-publicaties/formulieren/2016/osv/osv-bestanden/determination-of-the-election-result)