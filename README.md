# Urn Uitslag

## Wat is URN Uitslag?
De Kiesraad wil de software Ondersteunende Software Verkiezingen (OSV) vervangen. Het deel van de software dat het proces tijdens en na de verkiezingsdag zal ondersteunen wordt in huis gebouwd door een eigen ontwikkelteam.
URN Uitslag ondersteunt het papieren proces, van het tellen van de stemmen tot en met de zetelverdeling, bij alle in Nederland gebruikelijke verkiezingsvormen.

De eerste stap is het bouwen van de uitslagensoftware voor het Gemeentelijk Stembureau. Onderdeel hiervan zijn ook het datamodel en de in- en export van EML-bestanden. De module voor het Gemeentelijk Stembureau biedt zo houvast voor de ontwikkeling van de rest van de uitslagensoftware.

De software omvat de flow van stemmen tot en met de zetelverdeling:

- Ondersteuning bij het optellen van stemmen
- Genereren van documenten voor processen-verbaal
- Controleren van data op basis van scenario's
- Verificatie bij elke stap
- Exporteren van resultaten
- Berekening van zetelverdeling
- In- en exporteren van EML-bestanden

### Onduidelijkheden

Er zijn enkele zaken die nog niet vast staan en waar nog een beslissing over moet worden genomen. Dit bepalen we in de komende periode.

- Hoe regelen we afzenderverificatie?
- Hoe wisselen we bestanden uit?
- Hoe moet de software worden geïnstalleerd en geconfigureerd?

## Projectstructuur

- [Backend](/backend/)
- [Frontend](/frontend/)
- [Documentatie](/documentatie/)

Lees voor meer informatie het bestand `README.md` in elke directory.

## Installatie en configuratie

Hier komen t.z.t. de installatie-instructies.

### Git pre-commit hook using Lefthook

This project uses [Lefthook] to manage the Git pre-commit hook. Lefthook will
be installed automatically when `npm install` is run in the `frontend`
directory.

[Lefthook]: https://github.com/evilmartians/lefthook

## Bijdragen

We ontwikkelen URN Uitslag open source, niet alleen omdat dit de transparantie bevordert maar ook omdat we bijdragen vanuit de community verwelkomen. Als je iets wilt bijdragen of als je een vraag hebt, kun je een issue openen op GitHub met daarin een gedetailleerde beschrijving. Ook kun je contact opnemen met onze teamlead Niels Hatzmann: [niels.hatzmann@kiesraad.nl](mailto:niels.hatzmann@kiesraad.nl).

## Copyright en licenties

Copyright © 2024 Kiesraad. Licensed under the EUPL-1.2 or later.
