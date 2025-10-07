# Over deze use cases

Scope van deze use cases zijn de Gemeenteraadsverkiezingen.

Verwachting is dat de Eilandsraadverkiezingen makkelijk in dezelfde use cases opgenomen kunnen worden, omdat ze heel gelijkaardig zijn aan Gemeenteraadsverkiezingen.

Voor alle andere verkiezingen wordt een eerste stap het bijhouden van een apart bestand met de belangrijkste verschillen met Gemeenteraadsverkiezingen. Tot dat bestand er is, zie ["Wie doet welke stembureaus"](../verkiezingsproces/wie-doet-welke-stembureaus.md) en ["Wie mag waarvoor stemmen"](../verkiezingsproces/wie-mag-waarvoor-stemmen.md).

De use cases zijn niet specifiek over welke documenten (bijv. PVs) en bestanden (bijv. EMLs) gegenereerd of gebruikt worden. Hiervoor is een apart overzicht: ["Verloop verkiezingen"](../verkiezingsproces/verloop-verkiezingen.md).

## Werkwijze

Deze beschrijving van use cases is gebaseerd op "Writing Effective Use Cases" van Alistair Cockburn (2000).

De belangrijkste ideeën uit dat boek zijn:

- Use cases worden in tekst uitgewerkt, diagrammen (UML) zijn een aanvulling.
- Use cases vormen een boomstructuur waarin elke stap in een use case uitgewerkt kan worden tot een onderliggende use case.
- Use cases moeten niet uitgebreider/formeler/gedetailleerder zijn dan strikt nodig is.

Waarom deze werkwijze nuttig kan zijn:

- De boomstructuur is makkelijk te lezen en te navigeren.
- Het geeft een goed overzicht van stakeholders en hun belangen (daar zijn er veel van).
- Het geeft een goed overzicht van varianten ('uitbreidingen') op het hoofdscenario (het 'main success scenario').
- Het is een beschrijving van buitenaf wat de applicatie(s) moet(en) doen, niet hoe.
- Het faciliteert feedback en reviews door stakeholders.

## Hoe use cases te schrijven

### 1. Het grote plaatje

- In/out of scope-lijst
- Lijst van primaire actoren (menselijke en niet-menselijke)
- Lijst van gebruikersdoelen (actor-doel-lijst)

### 2. De uiterste use cases

- Uiterste hoog-over use cases (één voor elke primaire actor)

### 3. Verder uitwerken van use cases

1. Kies één use case om verder uit te werken.
2. Schrijf op welke stakeholders en belangen, precondities en garanties er zijn.
3. Schrijf het hoofdscenario (meest eenvoudige succes-scenario) uit.
4. Stel de lijst van uitbreidingen op, zowel scenario's waar de primaire actor zijn/haar doel bereikt, als waar dat niet lukt.
5. Schrijf de stappen voor het behandelen van de uitbreidingen uit.
6. Extraheer complexe flows tot onderliggende use cases.
7. Herhaal het proces door weer bovenaan deze lijst te beginnen.

## Use case template

De meest minimale versie van een use case bestaat uit scope, niveau en beschrijving. De onderstaande lijst met minimale en optionele velden is dus niet definitief en kan aangepast worden. We kunnen ook velden toevoegen, zoals "verkiezingen" (voor welke verkiezingen geldt deze use case?) of input/output-bestanden (EMLs, PV's, CSV's, ...)

Het huidige template is te vinden in [template-use-cases.md](./template-use-case.md).

### Minimale velden

__Niveau:__  

- Heel hoog-over (wolk) ☁️
- Hoog-over (vlieger) 🪁
- Gebruikersdoel (zee) 🌊
  - 1 persoon, 1 sessie (ca. 2-20 minuten)
  - Dit is het ideale niveau voor use cases.
- Subfunctie (vis) 🐟
  - Schrijf deze alleen wanneer dit echt nodig is.
- Te laag (schelp) 🐚
  - Dit niveau is te granulair, gooi ze weg.

__Trigger:__ trigger van de use case

__Hoofdscenario:__

- Dit is het meest eenvoudige succes-scenario.
- Het scenario bevat 5-9 stappen.
- Beschrijft de acties van actoren om het doel van de primaire actor te bereiken.
- Er zijn drie soorten acties (stappen):
  - Interactie tussen twee actoren om een doel te bereiken
  - Een validatie om een stakeholder te beschermen
  - Een *internal state change* namens een stakeholder

__Uitbreidingen:__

- De nummering van een uitbreiding komt overeen met de stap in het hoofdscenario waarvan het een uitbreiding is.

__Open punten:__  

- Schrijf hier open punten op die gerelateerd zijn aan deze use case.
- Dit kopje is niet aanwezig als er geen open punten zijn.

### Mogelijke extra velden

- Precondities
- Stakeholders en belangen van stakeholders die door de use case beschermd worden
- Minimale garanties
- Succesgaranties
- Primaire actor
- Doel binnen de context
- Prioriteit
- Releases
- Scope: organisatie, systeem of component; black-box of white-box
- Verkiezingen: Tweede Kamer (TK), Europees Parlement (EP), Provinciale Staten (PS), Waterschappen (AB), Kiescolleges Eerste Kamer (KC), Eerste Kamer (EK), Eilandsraden (ER), Gemeenteraad/Herindeling (GR)
