# Abacus software voor verkiezingsuitslagen en zetelverdeling

<p align="center">
<img src="/documentatie/img/abacus.svg" alt="Abacus software voor verkiezingsuitslagen en zetelverdeling" height="300px">
</p>

## Snelle links

### Documentatie

- Begin hier voor meer context: [Het verkiezingsproces en Abacus](/documentatie/gebruikersdocumentatie/verkiezingsproces-en-abacus.md)
- Begin hier als je meteen aan de slag wilt: [Installeren en starten](/documentatie/gebruikersdocumentatie/installeren-en-starten.md)
- Functionaliteit voor de demo en voor versie 1.0: [Functionaliteit van Abacus: eisen en wensen](/documentatie/functionaliteit/functionaliteit-eisen-en-wensen.md)
- Voor alle documentatie: [Hoofdpagina voor documentatie](/documentatie/README.md)

### Projectstructuur

- [Codebase Backend](/backend/)
- [Codebase Frontend](/frontend/)
- [Ontwerp gebruikersinterface (Figma)](https://www.figma.com/design/xHDfsv69Nhmk3IrWC0303B/Public---Kiesraad---Abacus-optelsoftware?node-id=3190-28385&t=VnghjibSJMqrQepm-1)

## Wat is Abacus?

De Kiesraad ontwikkelt nieuwe software voor de berekening van de uitslag van de verkiezingen: Abacus, software voor verkiezingsuitslagen en zetelverdeling. Het programma telt uitslagen bij elkaar op en berekent de zetelverdeling. Abacus vervangt de module Uitslagvaststelling van het programma Ondersteunende Software Verkiezingen (OSV2020) en zal ingezet worden bij alle verkiezingen in Nederland.

Voor meer context over het gebruik van Abacus lees je [Het verkiezingsproces en Abacus](documentatie/gebruikersdocumentatie/verkiezingsproces-en-abacus.md). Je kunt hiervoor ook kijken naar de presentatie [Abacus: Software for Secure and Transparent Voting Results](https://youtu.be/qhYd_LNS2nQ) die we in november 2024 hebben gegeven op WICCON (in het Engels).

Abacus is werk in uitvoering! Dit betekent dat de functionaliteit stapsgewijs wordt gebouwd. Kijk bij [Functionaliteit van Abacus: eisen en wensen](/documentatie/functionaliteit/functionaliteit-eisen-en-wensen.md) om te zien welke mijlpalen we hebben gesteld en hoe versie 1.0 eruit komt te zien voor de gemeenteraadsverkiezingen in maart 2026.

### Techniek

De eerste versie van Abacus wordt voor de gemeenteraadsverkiezingen gebouwd als een stand-alone binary, die net als OSV2020 in een lokaal netwerk met een webbrowser benaderbaar is. Dit is de basisversie die de Kiesraad in alle scenario's nodig heeft. De backend wordt geschreven in de programmeertaal Rust, de frontend in TypeScript/React.

Een [overzicht van de architectuur](/documentatie/softwarearchitectuur/Overzicht.md) is te vinden in de documentatie, net als de afwegingen die gemaakt zijn bij [de keuzes voor Rust, Typescript en React](</documentatie/softwarearchitectuur/overwegingen-talen-en-frameworks.md>).

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

We ontwikkelen Abacus open source omdat dit de transparantie bevordert. We zijn altijd nieuwsgierig naar nieuwe perspectieven of invalshoeken, alle vragen zijn welkom. Voor de duidelijkheid: de Kiesraad heeft concrete plannen en doelstellingen met Acabus, en die zijn leidend. Hierdoor is het goed mogelijk dat een waardevolle bijdrage uit de community toch niet kan worden meegenomen, omdat we anders beloofde dingen niet op tijd waar kunnen maken. Als je iets wilt bijdragen aan de software, neem dan vooraf contact op via e-mail: abacus[@]kiesraad.nl.

Het team werkt met een planning en epics zoals opgenomen in het projectbord. Alle PR's worden grondig gereviewd, zoals we dat ook met ons eigen werk doen. We zoeken regelmatig nieuwe collega's.

Als je een bijdrage aan de broncode wilt leveren vragen we je om vooraf een [contributor licence agreement (CLA)](/CLA.md) te tekenen, met name om het gebruiksrecht op je bijdrage eenduidig te regelen. Stuur de getekende CLA naar abacus[@]kiesraad.nl. Dank alvast!

## Meldingen en security-issues

Alle meldingen over onze software zijn welkom. Voor meldingen kun je het team direct bereiken via abacus[@]kiesraad.nl, voor security-issues kun je direct contact opnemen met onze CISO Fleur van Leusden via security[@]kiesraad.nl.

## Over de Kiesraad

In Nederland mogen we al meer dan honderd jaar via verkiezingen bepalen wie onze volksvertegenwoordigers zijn. Voor onze democratie is het van groot belang om een betrouwbaar, transparant en controleerbaar verkiezingsproces in te richten en in stand te houden. Dat doen we met wetten en regels, maar vooral met mensen, die er samen voor zorgen dat verkiezingen eerlijk verlopen en dat iedere stem meetelt.

De Kiesraad is de onafhankelijke autoriteit in Nederland op het gebied van verkiezingen. De missie van de Kiesraad is dat iedereen de uitslag van de verkiezingen kan vertrouwen.

De Kiesraad adviseert de regering en het parlement over verkiezingen en het kiesrecht. Dit doen we gevraagd en ongevraagd. We evalueren iedere verkiezing en adviseren de minister over mogelijke verbeteringen.

In het verkiezingsproces wordt digitalisering ingezet als hulpmiddel. De Kiesraad is verantwoordelijk voor de ontwikkeling en het beheer van de ondersteunende software die gebruikt wordt bij de kandidaatstelling en de vaststelling van de uitslagen van verkiezingen.

Als informatie- en expertisecentrum over verkiezingen beheert de Kiesraad een verkiezingsdatabank die de uitslagen van meer dan 700 verkiezingen omvat, teruggaand tot 1848. De Kiesraad is benaderbaar voor iedereen die uitleg wil over het verkiezingsproces.

Meer informatie over de verkiezingen en de Kiesraad is te vinden op [www.kiesraad.nl](https://www.kiesraad.nl)

## Auteursrecht en licenties

Auteursrecht © 2024 Kiesraad.
Gelicentieerd onder EUPL-1.2 of hoger, tenzij anders aangegeven:

- Fonts in `frontend/static/font` en `backend/templates/fonts` zijn gelicentieerd onder de SIL Open Font License versie 1.1 (OFL v1.1).
- De bestanden `frontend/app/msw-mock-api.ts` en `frontend/app/test/unit/server.ts`
  zijn gelicentieerd onder de Mozilla Public License v2.0 (MPL 2.0).
- Dependencies uit npm en Cargo zijn gelicentieerd onder hun eigen respectievelijke licenties.

Versies van EUPL-1.2 in alle officiële EU-talen zijn beschikbaar op
<https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12>.
De Engelse versie is te vinden onder [LICENSE](LICENSE).
