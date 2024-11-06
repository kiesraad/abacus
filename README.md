# Abacus software voor verkiezingsuitslagen en zetelverdeling

## Wat is Abacus?
De Kiesraad ontwikkelt nieuwe software voor de berekening van de uitslag van de verkiezingen: Abacus, software voor verkiezingsuitslagen en zetelverdeling. Het programma telt uitslagen bij elkaar op en berekent de zetelverdeling. Abacus vervangt de module Uitslagvaststelling van het programma Ondersteunende Software Verkiezingen (OSV2020) en zal ingezet worden bij alle verkiezingen in Nederland.

<p align="center">
<img src="/documentatie/img/abacus.svg" alt="Abacus software voor verkiezingsuitslagen en zetelverdeling" height="300px">
</p>

## Papieren proces is leidend
Na afloop van verkiezingen worden in de stembureaus de stembiljetten met de hand geteld en de uitkomsten vastgelegd in een proces-verbaal. Vervolgens tellen gemeentelijke stembureaus, hoofdstembureaus en het centraal stembureau de uitslagen van de stembureaus digitaal bij elkaar op. Hierbij zal Abacus worden gebruikt, met als doel een zorgvuldige invoer en correcte optelling. De optellingen en de zetelverdeling die met de programmatuur worden gegenereerd, worden handmatig gecontroleerd, aan de hand van controleprotocollen die de Kiesraad opstelt.

## Transparantie en eenvoud 🧮

De naam Abacus komt uit het Latijn. Het is een telraam dat veel in wiskundeonderwijs en in de handel wordt gebruikt. Het is een transparant en eenvoudig hulpmiddel om grote berekeningen uit te voeren en sluit zo aan bij de waarden die we in het verkiezingsproces belangrijk vinden. Abacus is er ook als [emoji: 🧮](https://unicode.org/emoji/charts/full-emoji-list.html#1f9ee).

## Ontwikkeling

De software wordt ontworpen en gebouwd door de Kiesraad zelf, in nauwe samenspraak met gebruikers, met name mensen bij gemeenten, waterschappen en de Caribische openbare lichamen. Het team werkt in deze repository aan de software, dus wat je hier ziet is in ontwikkeling. De software staat figuurlijk in de steigers, we werken er dagelijks aan.

Abacus software voor uitslagvaststelling en zetelverdeling biedt een stapsgewijze vervanging voor OSV2020. De eerste software die in productie wordt genomen vervangt de module van OSV2020 voor de uitslagvaststelling en zetelverdeling bij gemeenteraadsverkiezingen. Vanuit deze eerste versie wordt de software doorontwikkeld voor andere rollen en verkiezingen. De software wordt pas in productie genomen als deze aan alle eisen voldoet.

De uitgangspunten bij het ontwerp en de bouw van Abacus zijn gebruiksvriendelijkheid en eenvoud, naast de waarden integriteit, transparantie en controleerbaarheid. De software dient voor het correct invoeren van de resultaten van de stembureaus volgens het vier-ogen principe, voor het maken van de optelling van alle ingevoerde stembureaus en het opstellen van het proces-verbaal met de resultaten. 

Meer informatie over het proces en de uitvoering van de verkiezingen in Nederland is te vinden op de website van de Kiesraad onder 'verkiezingen': [kiesraad.nl/verkiezingen](https://www.kiesraad.nl/verkiezingen)

## Functies

De eerste stap is het bouwen van de uitslagensoftware voor de gemeenteraadsverkiezingen, hier wordt nu aan gewerkt. De software omvat de flow van invoeren en optellen van de getelde stemmen tot en met de zetelverdeling:

- Invoer uitslagen en correcties
- Optelling GSB
- Proces-verbaal (PDF)
- EML_NL xml
- Check op interne consistentie
- Controleprotocol opmerkelijke uitslagen
- Zetelverdeling
- Afzenderverificatie

### Work in progress

We denken nog na over de beste manier om de volgende functionaliteit in te bouwen: 

- Afzender- en bestandsverificatie
- Bestandsuitwisseling
- Installatie en configuratie van de software en invoerstations

## Techniek

De eerste versie van Abacus wordt voor de gemeenteraadsverkiezingen gebouwd als een stand-alone binary, die net als OSV2020 in een lokaal netwerk met een webbrowser benaderbaar is. Dit is de basisversie die de Kiesraad in alle scenario's nodig heeft. De backend wordt geschreven in de programmeertaal Rust, de frontend in TypeScript/React. 

Een [overzicht van de architectuur](/documentatie/softwarearchitectuur/Overzicht.md) is te vinden in de documentatie, net als de afwegingen die gemaakt zijn bij [de keuzes voor Rust, Typescript en React](</documentatie/softwarearchitectuur/overwegingen-talen-en-frameworks.md>). 

## Beveiligingsmaatregelen

Het uitgangspunt in Nederland is dat het papier leidend is bij het bepalen van de verkiezingsuitslag en dat de software hierbij ondersteunt. Hiervoor worden controles uitgevoerd, waarbij steeds teruggekeken wordt of de invoer, optelling en berekening van de software klopt met het papier.

Daarnaast zijn voor de software, de ontwikkeling en het gebruik onder andere de volgende maatregelen genomen:

* Eenvoud als uitgangspunt: minimale functies, eenvoudige en overzichtelijke techniek
* Veilige programmeertaal (Rust)
* Ontwikkel- en releaseproces met reviews en beveiligingsonderzoek
* Definitieve release: pentest en toets op wettelijke kaders, rapportages openbaar
* Lokale installatie zonder internet
* Afzender- en bestandsverificatie (weten van wie een bestand komt en dat het correct is)

## Projectstructuur

- [Documentatie](/documentatie/)
- [Backend codebase](/backend/)
- [Frontend codebase](/frontend/)
- [Ontwerp user interface (Figma)](https://www.figma.com/design/xHDfsv69Nhmk3IrWC0303B/Public---Kiesraad---Abacus-optelsoftware?node-id=3190-28385&t=VnghjibSJMqrQepm-1)

Lees voor meer informatie het bestand `README.md` in elke directory.

## Starten met Abacus

De functionaliteit is nog beperkt, maar het is al mogelijk om Abacus zelf te proberen en te testen. De basisflow invoeren-optellen-PDF werkt al. In de [documentatie](https://github.com/kiesraad/abacus/blob/main/documentatie/functionaliteit/functionaliteit-eisen-en-wensen.md) en op het [board](https://github.com/orgs/kiesraad/projects/1) zie je waar we mee bezig zijn. 

Er zijn een aantal opties beschikbaar om te zien waar we staan. Abacus wordt gemaakt om offline te gebruiken, de 'Binary' optie staat het dichtst bij de toepassing.

### Frontend

De interface van onze 'main' branch met de actuele broncode is [als website te benaderen](https://kiesraad-abacus.pages.dev/). Het is alleen de interface die tegen een test-backend praat en een deel van de functionaliteit mist. 

### Binary

Op basis van de nieuwste broncode maken we dagelijks een nieuwe versie van de binary die je kunt downloaden. Deze binary werkt op Ubuntu 22.04 en nieuwer. Klik door via de nieuwste link [op deze pagina](https://github.com/kiesraad/abacus/actions/workflows/build-lint-test.yml) en download de laatste backend_build. Pak het bestand uit en start met -rs om een nieuwe database op te bouwen: `./api -rs`. Een versie voor Windows is in de maak. 

### Development omgeving: 

Je kunt Abacus ook gewoon zelf compileren. Hiervoor kun je de readme's in de [backend](https://github.com/kiesraad/abacus/blob/main/backend/README.md) en [frontend](https://github.com/kiesraad/abacus/blob/main/frontend/README.md) directory gebruiken. Er is ook een docker schil beschikbaar. 

## Bijdragen

We ontwikkelen Abacus open source omdat dit de transparantie bevordert. We zijn altijd nieuwsgierig naar nieuwe perspectieven of invalshoeken, alle vragen zijn welkom. Voor de duidelijkheid: de Kiesraad heeft concrete plannen en doelstellingen met Acabus, en die zijn leidend. Hierdoor is het goed mogelijk dat een waardevolle bijdrage uit de community toch niet kan worden meegenomen, omdat we anders beloofde dingen niet op tijd waar kunnen maken. Als je iets wilt bijdragen aan de software, neem dan vooraf contact op via e-mail: abacus[@]kiesraad.nl. 

Het team werkt met een planning en epics zoals opgenomen in het projectbord. Alle PR's worden grondig gereviewd, zoals we dat ook met ons eigen werk doen. We zoeken regelmatig nieuwe collega's. 

Als je een bijdrage aan de broncode wilt leveren vragen we je om vooraf een [contributor licence agreement (CLA)](/CLA.md) te tekenen, met name om het gebruiksrecht op je bijdrage eenduidig te regelen. Stuur de getekende CLA naar abacus[@]kiesraad.nl. Dank alvast!

## Meldingen en security issues

Alle meldingen over onze software zijn welkom. Voor meldingen kun je het team direct bereiken via abacus[@]kiesraad.nl, voor security issues kun je direct contact opnemen met onze CISO Fleur van Leusden via security[@]kiesraad.nl. 

## Over de Kiesraad

In Nederland mogen we al meer dan honderd jaar via verkiezingen bepalen wie onze volksvertegenwoordigers zijn. Voor onze democratie is het van groot belang om een betrouwbaar, transparant en controleerbaar verkiezingsproces in te richten en in stand te houden. Dat doen we met wetten en regels, maar vooral met mensen, die er samen voor zorgen dat verkiezingen eerlijk verlopen en dat iedere stem meetelt.

De Kiesraad is de onafhankelijke autoriteit in Nederland op het gebied van verkiezingen. De missie van de Kiesraad is dat iedereen de uitslag van de verkiezingen kan vertrouwen. 

De Kiesraad adviseert de regering en het parlement over verkiezingen en het kiesrecht. Dit doen we gevraagd en ongevraagd. We evalueren iedere verkiezing en adviseren de minister over mogelijke verbeteringen. 

In het verkiezingsproces wordt digitalisering ingezet als hulpmiddel. De Kiesraad is verantwoordelijk voor de ontwikkeling en het beheer van de ondersteunende software die gebruikt wordt bij de kandidaatstelling en de vaststelling van de uitslagen van verkiezingen. 

Als informatie- en expertisecentrum over verkiezingen beheert de Kiesraad een verkiezingsdatabank die de uitslagen van meer dan 700 verkiezingen omvat, teruggaand tot 1848. De Kiesraad is benaderbaar voor iedereen die uitleg wil over het verkiezingsproces.

Meer informatie over de verkiezingen en de Kiesraad is te vinden op [www.kiesraad.nl](https://www.kiesraad.nl)

## Copyright en licenties

Copyright © 2024 Kiesraad.
Licensed under the EUPL-1.2 or later, except where indicated otherwise:

- Fonts in `frontend/static/font` and `backend/templates/fonts` are licensed under
  the SIL Open Font License version 1.1 (OFL v1.1).
- The files `frontend/app/msw-mock-api.ts` and `frontend/app/test/unit/server.ts`
  are licensed under the Mozilla Public License v2.0 (MPL 2.0).
- Dependencies from npm and Cargo are licensed under their respective licenses.

Versions of the EUPL-1.2 in all official EU languages can be found at
https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12.
The English version is included verbatim in [LICENSE](LICENSE).
