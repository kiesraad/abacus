# Abacus software voor verkiezingsuitslagen en zetelverdeling

<p align="center">
<img src="/documentatie/img/abacus.svg" alt="Abacus software voor verkiezingsuitslagen en zetelverdeling" height="300px">
</p>

## Snelle links

### Documentatie

- Voor informatie over het installeren, starten en gebruiken van Abacus ga je naar de website [Abacus Documentatie](https://kiesraad.github.io/abacus-documentatie/). Hier vind je niet alleen alle beschikbare gebruikersdocumentatie, maar bieden we ook uitleg over het verkiezingsproces.
- Alle documentatie met betrekking tot de ontwikkeling van Abacus vind je op de [Hoofdpagina voor documentatie](/documentatie/README.md) in deze repository. Hier staat documentatie over de functionaliteit, de softwarearchitectuur, ons ontwikkelproces en specifieke facetten van het verkiezingsproces.

### Functionaliteit

- De functionele eisen en wensen voor versie 1.0 zijn te vinden via [Functionaliteit van Abacus: eisen en wensen](/documentatie./functionaliteit/functionaliteit-eisen-en-wensen.md).

### Projectstructuur

- [Codebase Backend](/backend/)
- [Codebase Frontend](/frontend/)
- [Ontwerp gebruikersinterface (Figma)](https://www.figma.com/design/xHDfsv69Nhmk3IrWC0303B/Public---Kiesraad---Abacus-optelsoftware?node-id=3190-28385&t=VnghjibSJMqrQepm-1)

## Wat is Abacus?

De Kiesraad ontwikkelt nieuwe software voor de berekening van de uitslag van de verkiezingen: Abacus, software voor verkiezingsuitslagen en zetelverdeling. Het programma telt uitslagen bij elkaar op en berekent de zetelverdeling. Abacus vervangt de module Uitslagvaststelling van het programma Ondersteunende Software Verkiezingen (OSV2020) en zal ingezet worden bij alle verkiezingen in Nederland.

Voor meer context over het gebruik van Abacus lees je [Het verkiezingsproces en Abacus](https://kiesraad.github.io/abacus-documentatie/verkiezingsproces-en-abacus.html). Je kunt hiervoor ook kijken naar de presentatie [Abacus: Software for Secure and Transparent Voting Results](https://youtu.be/qhYd_LNS2nQ) die we in november 2024 hebben gegeven op WICCON (in het Engels).

Abacus is werk in uitvoering! Dit betekent dat de functionaliteit stapsgewijs wordt gebouwd. Kijk bij [Functionaliteit van Abacus: eisen en wensen](/documentatie/functionaliteit/functionaliteit-eisen-en-wensen.md) om te zien welke mijlpalen we hebben gesteld. 

OSV2020 is de huidige software die bij verkiezingen wordt gebruikt. Het ontwikkelteam werkt nu aan een versie van Abacus die geschikt is voor toepassing bij de verkiezingen voor de Gemeenteraad. Abacus kan worden ingezet als het af is, aan alle eisen voldoet en de Kiesraad besloten heeft over de toepassing. 

### Techniek

De eerste versie van Abacus wordt voor de gemeenteraadsverkiezingen gebouwd als een stand-alone binary, die net als OSV2020 in een lokaal netwerk met een webbrowser benaderbaar is. Dit is de basisversie die de Kiesraad in alle scenario's nodig heeft. De backend wordt geschreven in de programmeertaal Rust, de frontend in TypeScript/React.

Een [overzicht van de architectuur](/documentatie/softwarearchitectuur/Overzicht.md) is te vinden in de documentatie, net als de afwegingen die gemaakt zijn bij [de keuzes voor Rust, TypeScript en React](</documentatie/softwarearchitectuur/overwegingen-talen-en-frameworks.md>).

### Beveiligingsmaatregelen

Het uitgangspunt in Nederland is dat het papieren proces leidend is bij het bepalen van de verkiezingsuitslag en dat de software dit proces ondersteunt. Hiervoor worden controles uitgevoerd, waarbij steeds teruggekeken wordt of de invoer, optelling en berekening van de software klopt met het papier.

Daarnaast zijn voor de software, de ontwikkeling en het gebruik onder andere de volgende maatregelen genomen:

- Eenvoud als uitgangspunt: minimale functies, eenvoudige en overzichtelijke techniek
- Veilige programmeertaal (Rust)
- Ontwikkel- en releaseproces met reviews en beveiligingsonderzoek
- Definitieve release: pentest en toets op wettelijke kaders, rapportages openbaar
- Lokale installatie zonder internet
- Afzender- en bestandsverificatie (weten van wie een bestand komt en dat het correct is)

## Papieren proces is leidend

Na afloop van verkiezingen worden in de stembureaus de stembiljetten met de hand geteld en de uitkomsten vastgelegd in een proces-verbaal. Vervolgens tellen gemeentelijke stembureaus, hoofdstembureaus en het centraal stembureau de uitslagen van de stembureaus digitaal bij elkaar op. Hierbij zal Abacus worden gebruikt, met als doel een zorgvuldige invoer en correcte optelling. De optellingen en de zetelverdeling die met de programmatuur worden gegenereerd, worden handmatig gecontroleerd, aan de hand van controleprotocollen die de Kiesraad opstelt.

## Transparantie en eenvoud

De naam Abacus komt uit het Latijn. Het is een telraam dat veel in wiskundeonderwijs en in de handel wordt gebruikt. Het is een transparant en eenvoudig hulpmiddel om grote berekeningen uit te voeren en sluit zo aan bij de waarden die we in het verkiezingsproces belangrijk vinden. Abacus is er ook als [emoji: 🧮](https://unicode.org/emoji/charts/full-emoji-list.html#1f9ee).

## Ontwikkeling

De software wordt ontworpen en gebouwd door de Kiesraad zelf, in nauwe samenspraak met gebruikers, met name mensen bij gemeenten, waterschappen en de Caribische openbare lichamen. Het team werkt in deze repository aan de software, dus wat je hier ziet is in ontwikkeling. De software staat figuurlijk in de steigers, we werken er dagelijks aan.

Abacus software voor uitslagvaststelling en zetelverdeling biedt een stapsgewijze vervanging voor OSV2020. De eerste software die in productie wordt genomen vervangt de module van OSV2020 voor de uitslagvaststelling en zetelverdeling bij gemeenteraadsverkiezingen. Vanuit deze eerste versie wordt de software doorontwikkeld voor andere rollen en verkiezingen. De software wordt pas in productie genomen als deze aan alle eisen voldoet.

De uitgangspunten bij het ontwerp en de bouw van Abacus zijn gebruiksvriendelijkheid en eenvoud, naast de waarden integriteit, transparantie en controleerbaarheid. De software dient voor het correct invoeren van de resultaten van de stembureaus volgens het vier-ogenprincipe, voor het maken van de optelling van alle ingevoerde stembureaus en het opstellen van het proces-verbaal met de resultaten.

Meer informatie over het proces en de uitvoering van de verkiezingen in Nederland is te vinden op de website van de Kiesraad onder 'verkiezingen': [kiesraad.nl/verkiezingen](https://www.kiesraad.nl/verkiezingen)

## Bijdragen

Je kunt op verschillende manieren bijdragen leveren aan Abacus. Kijk hiervoor in de sectie [Bijdragen](CONTRIBUTING.md).

## Beveiliging

Alle beveiligingsmeldingen over onze software zijn welkom. Kijk hiervoor in de sectie [Beveiliging](/SECURITY.md).

## Over de Kiesraad

De Kiesraad is de onafhankelijke autoriteit in Nederland op het gebied van verkiezingen. De missie van de Kiesraad is dat iedereen de uitslag van de verkiezingen kan vertrouwen.

Meer informatie over de Kiesraad en de verkiezingen is te vinden op onze [GitHub organisatie-pagina](https://github.com/kiesraad) en op [www.kiesraad.nl](https://www.kiesraad.nl)

## Auteursrecht en licenties

Auteursrecht © 2024 Kiesraad.
Gelicentieerd onder EUPL-1.2 of hoger, tenzij anders aangegeven:

- Fonts in `frontend/src/assets/font` en `backend/templates/fonts` zijn gelicentieerd onder de SIL Open Font License versie 1.1 (OFL v1.1).
- De bestanden `frontend/src/testing/msw-mock-api.ts` en `frontend/src/testing/server.ts`
  zijn gelicentieerd onder de Mozilla Public License v2.0 (MPL 2.0).
- Dependencies uit npm en Cargo zijn gelicentieerd onder hun eigen respectievelijke licenties.

Versies van EUPL-1.2 in alle officiële EU-talen zijn beschikbaar op
<https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12>.
De Engelse versie is te vinden onder [LICENSE](LICENSE).
