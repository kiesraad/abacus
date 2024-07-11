# Abacus 🧮 software voor verkiezingsuitslagen en zetelverdeling

## Wat is Abacus?

De Kiesraad gaat de software Ondersteunende Software Verkiezingen (OSV2020) vervangen. Het deel van de software dat het
proces tijdens en na de verkiezingsdag zal ondersteunen wordt in huis gebouwd door een eigen ontwikkelteam.
Abacus ondersteunt het papieren proces, van het optellen van de stemmen tot en met de zetelverdeling, bij alle in
Nederland gebruikelijke verkiezingsvormen. De naam van de software is "Abacus software voor verkiezingsuitslagen en zetelverdeling", kortweg "Abacus".

De naam Abacus komt uit het Latijn. Het is een telraam dat veel in wiskundeonderwijs en in de handel wordt gebruikt. Het is de meest transparante en eenvoudige manier om grote berekeningen uit te voeren en sluit zo aan bij de waarden die we in het verkiezingsproces belangrijk vinden. 

## Aanpak

Abacus software voor uitslagvaststelling en zetelverdeling biedt een stapsgewijze vervanging voor OSV2020. De eerste software die in productie wordt genomen vervangt de GSB-U module van OSV2020 voor de uitslagvaststelling en zetelverdeling voor gemeenteraadsverkiezingen. Vanuit deze eerste versie wordt de software doorontwikkeld voor andere rollen en verkiezingen.

De uitgangspunten bij het ontwerp en de bouw van Abacus zijn gebruiksvriendelijkheid en eenvoud, naast de waarden integriteit, transparantie en controleerbaarheid. De software dient voor het correct invoeren van de resultaten van de stembureaus volgens het vier-ogen principe, voor het maken van de optelling van alle ingevoerde stembureaus en het opstellen van het proces-verbaal met de resultaten. 

Meer informatie over het proces en de uitvoering van de verkiezingen in Nederland is te vinden op de website van de Kiesraad onder 'verkiezingen': [https://www.kiesraad.nl/verkiezingen](https://www.kiesraad.nl/verkiezingen)

## Functies

De eerste stap is het bouwen van de uitslagensoftware voor het gemeentelijk en stembureau (GSB) en centraal stembureau (CSB) bij gemeenteraadsverkiezingen. De software omvat de flow van invoeren en optellen van de getelde stemmen tot en met de zetelverdeling:

- Invoer uitslagen en correcties
- Optelling GSB
- Proces-verbaal (PDF)
- EML_NL xml
- Check op interne consistentie
- Controleprotocol opmerkelijke uitslagen
- Zetelverdeling
- Afzenderverificatie

### Work in progress

Er zijn enkele zaken waar we nog over nadenken:

- Afzender- en bestandsverificatie
- Bestandsuitwisseling
- Installatie en configuratie van de software en invoerstations

## Techniek

Abacus wordt voor het GSB gebouwd als een stand-alone binary die net als OSV2020 in een lokaal netwerk met een webbrowser benaderbaar is. Dit is de basisversie die de Kiesraad in alle scenario's nodig heeft. De backend wordt geschreven in Rust, de frontend in TypeScript/React. Een [overzicht van de architectuur](/documentatie/softwarearchitectuur/overzicht.md) is te vinden in de documentatie. 

## Papier is leidend: beveiligingsmaatregelen

Het uitgangspunt in Nederland is dat het papier leidend is bij het bepalen van de verkiezingsuitslag en dat de software hierbij ondersteunt. Hiervoor worden controles uitgevoerd, waarbij steeds teruggekeken wordt of de invoer, optelling en berekening van de software klopt met het papier.

Daarnaast zijn voor de software, de ontwikkeling en het gebruik onder andere de volgende maatregelen genomen:

* Eenvoud als uitgangspunt: minimale functies, eenvoudige en overzichtelijke techniek
* Veilige programmeertaal (Rust)
* Ontwikkel- en releaseproces met reviews en beveiligingsonderzoek
* Definitieve release: pentest en toets op wettelijke kaders
* Lokale installatie zonder internet
* Afzender- en bestandsverificatie (weten van wie een bestand komt en dat het compleet is)

## Projectstructuur

- [Documentatie](/documentatie/)
- [Backend codebase](/backend/)
- [Frontend codebase](/frontend/)
- [Ontwerp user interface (Figma)](https://www.figma.com/design/xHDfsv69Nhmk3IrWC0303B/Public---Kiesraad---Abacus-optelsoftware?node-id=3190-28385&t=VnghjibSJMqrQepm-1)

Lees voor meer informatie het bestand `README.md` in elke directory.

## Bijdragen

We ontwikkelen Abacus open source, niet alleen omdat dit de transparantie bevordert, maar ook omdat we bijdragen vanuit de community verwelkomen. Als je iets wilt bijdragen of als je een vraag hebt, kun je een issue openen op GitHub. Ook kun je contact opnemen met het team via e-mail: [abacus@kiesraad.nl](mailto:abacus@kiesraad.nl). 

De software wordt beschikbaar gesteld onder de EUPL v1.2-licentie. 

Om bij te kunnen dragen aan de software vragen we je om een [contributor licence agreement (CLA)](/CLA.md) te tekenen, met name om het gebruiksrecht op je bijdrage eenduidig te regelen. Stuur de getekende CLA naar [abacus@kiesraad.nl](mailto:abacus@kiesraad.nl). Dank alvast!

## Meldingen en security issues

Alle meldingen over onze software zijn welkom. Je kunt het team direct bereiken via [abacus@kiesraad.nl](mailto:abacus@kiesraad.nl) of contact opnemen met onze CISO Fleur van Leusden via [security@kiesraad.nl](mailto:security@kiesraad.nl). 

## Copyright en licenties

Copyright © 2024 Kiesraad. Licensed under the EUPL-1.2 or later.
