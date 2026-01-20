# Over deze use cases

Scope van deze use cases zijn de Gemeenteraadsverkiezingen.

## Werkwijze

Deze beschrijving van use cases is gebaseerd op *"Writing Effective Use Cases"* van Alistair Cockburn (2000). Zie ook zijn meer recente *"The Mini-Book on Use Cases: All you need but short!"* (2025) en *"Unifying User Stories, Use Cases, Story Maps: The power of verbs"* (2024).

De belangrijkste ideeën uit dat boek zijn:

- Use cases worden in tekst uitgewerkt, diagrammen (UML) zijn een aanvulling.
- Use cases vormen een boomstructuur waarin elke stap in een use case uitgewerkt kan worden tot een onderliggende use case.
- Use cases moeten niet uitgebreider/formeler/gedetailleerder zijn dan strikt nodig is.
- Use cases worden iteratief en incrementeel uitgewerkt.

## Onderdelen van een use case

### Titel
De titel is de naam van de use case. Behalve van use cases op het hoogste niveau, is de titel van elke use cases ook een stap in een use case van een hoger niveau.

### Niveau
De mogelijke niveaus van een use case zijn:
- Heel hoog-over (wolk) ☁️
- Hoog-over (vlieger) 🪁
- Gebruikersdoel (zee) 🌊
    - 1 persoon, 1 sessie (ca. 2-20 minuten)
- Subfunctie (vis) 🐟
    - Schrijf deze alleen wanneer dit echt nodig is.
- Te laag (schelp) 🐚
    - Dit niveau is te granulair, gooi ze weg.

### Pre-condities (optioneel)
Condities die waar moeten zijn voor de use case en die gecontroleerd worden (bijv. door de applicatie) vóór de start van de use case.

### Hoofdscenario
Het hoofdscenario is het meest eenvoudige succes-scenario. Idealiter is het niet langer dan 5-9 stappen.

De stappen in het hoofdscenario (en in uitbreidingen) worden als eenduidige acties beschreven. Dus actieve, geen passieve zinnen. En geen acties met meerdere mogelijke uitkomsten. (Dus niet "Er wordt gecontroleerd of ..." maar "De applicatie stelt vast dat...")

### Uitbreidingen
De uitbreidingen zijn alternatieve successcenario's of foutscenario's (scenario's waarin de actor hun doel niet bereikt).

De notatie voor uitbreidingen is:

- De situatie krijgt het nummer van de stap waar het een alternatief op is en een letter (bijv. "4a."). De beschrijving van de situatie eindigt met een dubbele punt.
- Elke stap binnen een uitbreiding krijgt de aanduiding van de uitbreiding en een nummer (bijv. "4a1.", "4a2.", etc.). De beschrijving van de stap eindigt met een punt.

Binnen uitbreidingen kunnen ook weer uitbreidingen voorkomen. Als dat te onoverzichtelijk wordt, is het beter die in hun eigen use case uit te werken.

### Open punten
Schrijf hier open punten op gerelateerd aan de use case.
