# Vrijgaveadvies Abacus v1.0.1

## Inhoudsopgave

- Advies
- Beperkingen Abacus
- Terugvaloptie
- Uitgevoerde testwerkzaamheden
- Aandachts- en verbeterpunten testproces


## Advies

Abacus is de nieuwe software voor de ondersteuning van uitslagvaststelling. Op basis van de uitkomsten van de hieronder beschreven test- en kwaliteitstoetsen kan Abacus v1.0.1 ingezet worden bij de gemeenteraadsverkiezingen 2026 voor de ondersteuning van gemeentelijke stembureaus van gemeenten die gebruik maken van centrale stemopneming.

Tijdens de gemeenteraadsverkiezingen 2026 wordt Abacus ingezet bij 14 gemeenten. Voor deze beperkte scope is bewust gekozen om deze gemeenten optimaal te kunnen ondersteunen in de voorbereiding op en tijdens gebruik van Abacus.

Alle overige gemeenten zullen OSV2020-U gebruiken voor hun werkzaamheden als gemeentelijk stembureau (GSB). Alle gemeenten zullen OSV2020-U voor hun werkzaamheden als centraal stembureau (CSB) gebruiken.

## Beperkingen Abacus

Na GR26 zal het gebruik van Abacus worden geëvalueerd en zullen verbeterpunten worden geïdentificeerd. Deze zullen samen met onderstaande al bekende punten worden gewogen om Abacus verder te verbeteren.

### CSV-bestanden worden niet door Abacus gegenereerd

OSV2020-U genereert naast de processen-verbaal en de uitslagen in EML-formaat ook de uitslagen in CSV-formaat. Abacus doet dit niet. Voor gemeenten die Abacus gebruiken, wordt een aparte applicatie ("eml2csv") ter beschikking gesteld om het EML-bestand om te zetten naar een CSV-bestand zoals dat ook door OSV2020-U wordt gegenereerd. Naar de toekomst toe is het wel relevant het formaat van het CSV-bestand te documenteren en te evalueren.

### Strengere interpretatie vierogenpricipe
De implementatie van het vierogenprincipe bij invoer is strenger in Abacus dan in OSV2020-U. Als de eerste en tweede invoer van tellingen niet gelijk zijn, dan moet in Abacus de foutieve invoer volledig opnieuw gedaan worden. Dit creëert extra werk ten opzichte van gebruik van OSV2020-U, waarin als één van de twee invoeren correct zijn, het mogelijk is die invoer als de definitieve invoer aan te duiden.

Dit is een gevolg van een ontwerpkeuze in Abacus, namelijk dat alle definitieve aantallen twee keer handmatig ingevoerd moeten zijn geweest.

### Beperkte invoermogelijkheid tekstvelden processen-verbaal
Er zijn gedeeltes van de processen-verbaal die in Abacus ingevoerd zouden kunnen worden, maar waarvoor dat nog niet mogelijk is. Een voorbeeld hiervan is de presentielijst. Gevolg is dat gemeenten deze gedeeltes buiten Abacus om in moeten vullen.


## Terugvaloptie

Elk van de 14 gemeenten heeft tijdens de GSB-zitting ter plaatse uitgebreide ondersteuning vanuit de Kiesraad. Bij eventuele calamiteiten bij het gebruik van Abacus zullen zij de gemeente bijstaan bij het oplossen van deze problemen, of indien nodig bij het overschakelen op een fallback optie. Hiervoor is de GSB-module van OSV2020-U beschikbaar.


## Uitgevoerde testwerkzaamheden

### Relevante kwaliteitsattributen

In het ["Testen en kwaliteit"](https://github.com/kiesraad/abacus/blob/a1d4bf958a1038be5ea6e002f17fc800a67d45bb/documentatie/ontwikkelproces/testen-en-kwaliteit.md)-document staan de belangrijkste kwaliteitsattributen voor Abacus. Deze vallen uiteen in twee groepen: externe en interne kwaliteitsattributen. Externe kwaliteitsattributen zijn attributen waar gebruikers direct iets van merken. Interne kwaliteitsattributen zijn attributen die vooral impact hebben op het ontwikkelteam.

Belangrijkste externe kwaliteitsattributen:
- Betrouwbaarheid: kun je de software in de meeste situaties vertrouwen?
- Bruikbaarheid: is de software makkelijk te gebruiken? (voor alle bedoelde gebruikers, dus ook installatie, controleerbaar door burger, etc.)
- Beveiliging: biedt de software voldoende bescherming tegen ongewenst gebruik?

Belangrijkste interne kwaliteitsattributen:
- Testbaarheid: is het eenvoudig om de software te testen en controleren?
- Onderhoudbaarheid: kan de software eenvoudig worden onderhouden en aangepast?
- IT-bility: is de software eenvoudig te installeren, onderhouden en ondersteunen? Dit criterium overlapt met Bruikbaarheid, Testbaarheid en Onderhoudbaarheid, maar is belangrijk genoeg om ook expliciet te vermelden.

In de beschrijving hieronder van de uitgevoerde testwerkzaamheden wordt vooral aandacht gegeven aan de tests die raken aan de externe kwaliteitsattributen. Deze zijn namelijk het belangrijkst voor de beslissing of Abacus v1.0.1 goed genoeg is voor de beperkte uitrol.


### Testwerkzaamheden tijdens ontwikkeling

Ontwikkeling van Abacus is gestart in maart 2024. Tijdens de ontwikkeling werd er continu getest:

- review met "approval" van minstens twee teamleden
- [linting en geautomatiseerde tests op meerdere niveaus](https://github.com/kiesraad/abacus/blob/a1d4bf958a1038be5ea6e002f17fc800a67d45bb/documentatie/ontwikkelproces/test-tooling.md) in onze ["Build, lint & test"-pipeline](https://github.com/kiesraad/abacus/actions/workflows/build-lint-test.yml)
- exploratief testen

Om de ondersteuning van verschillende besturingssystemen te testen, draaide er tijdens de ontwikkeling een wekelijkse release-pipeline. Hierin werd de applicatie gedraaid op Windows, macOS en Linux en de end-to-end tests op Chrome, Firefox en Safari. Sinds de bouw van de v1.0.0-release draait deze pipeline alleen voor release candidates en wordt de applicatie niet meer op macOS gedraaid in de pipeline.  
Als aanvulling hierop wordt er binnen het team gebruik gemaakt van verschillende besturingssystemen en browsers.

Om de gebruiksvriendelijkheid en aansluiting op het proces te valideren, waren er regelmatig demo's met stakeholders en met de vaste gebruikersgroep.

Tot slot waren er een aantal toetsingsmomenten tijdens de ontwikkeling:

#### UX-lab voor invoer proces-verbaal

In oktober 2024 hebben we het gebruik van Abacus zonder handleiding of uitleg vooraf getoetst. De resultaten waren positief. De test liet zien dat Abacus de gebruikers goed ondersteunt bij het invoeren van de tellingen. De deelnemers gaven ook goede feedback over mogelijke verbeteringen.

Het [verslag van de gebruikerstest](https://github.com/kiesraad/abacus/tree/a1d4bf958a1038be5ea6e002f17fc800a67d45bb/documentatie/usability-tests/20241025-bevindingen.md) staat op GitHub.

#### SIG code review

In maart 2025 heeft de Software Improvement Group (SIG) een code review gedaan met focus op onderhoudbaarheid. Het rapport was positief en bevatte een aantal aanbevelingen die ondertussen opgevolgd zijn.

Het [rapport en een overzicht van de aanbevelingen met opvolging](https://github.com/kiesraad/abacus/tree/a1d4bf958a1038be5ea6e002f17fc800a67d45bb/documentatie/reviews/SIG2025) zijn op GitHub te vinden.

#### Performancetest parallelle invoer

In juni 2025 hebben we een performancetest uitgevoerd met als scope meerdere gebruikers die tegelijkertijd tellingen invoeren. Conclusie was dat het tegelijkertijd invoeren door een groot aantal gebruikers geen probleem is voor Abacus.

Zowel de [gebruikte code](https://github.com/kiesraad/abacus-k6-poc) als de [resultaten van de test](https://github.com/kiesraad/abacus/issues/1517) zijn op GitHub te vinden.

#### Security review Bureau Veritas Cybersecurity

In juli 2025 heeft Bureau Veritas Cybersecurity een code review gedaan met focus op security. De belangrijkste conclusie is dat Abacus over het geheel genomen robuust is. Daarnaast bevat het rapport een aantal aandachtspunten, die ofwel opgevolgd zijn voor deze release, ofwel later opgevolgd zullen worden, ofwel zijn toegelicht in onze reactie.

Het [rapport en onze reactie op de aandachtspunten](https://github.com/kiesraad/abacus/tree/a1d4bf958a1038be5ea6e002f17fc800a67d45bb/documentatie/reviews/Veritas2025) zijn te vinden op GitHub.


### Testwerkzaamheden specifiek voor de release

#### Exploratief testen

Het team heeft de nodige sessies exploratief testen uitgevoerd in oktober en november 2025. Dit gebeurde dus parallel aan het afronden van de ontwikkeling van de functionaliteit voor de tweede (en latere) zittingen. (Zie ook "Aandachts- en verbeterpunten testproces".)

Dat bracht een risico van regressie met zich mee. Dit risico hebben we gemitigeerd door (1) de gebruikelijke testwerkzaamheden tijdens ontwikkeling; (2) rekening te houden met deze wijzigingen bij het inplannen van de sessies.

De sessies waren enerzijds gericht op hoe Abacus het verkiezingsproces ondersteunt, anderzijds op een aantal gebieden die we voldoende risicovol vonden dat we er extra naar wilden kijken.

De [volledige lijst van testsessies](https://github.com/kiesraad/abacus/issues/2083) is terug te vinden in het gerelateerde issue op GitHub. Samengevat vielen de sessies uiteen in de volgende categorieën:
- sessies met interne stakeholders gericht op het proces en begrijpelijkheid
- doorlopen proces met de applicatie: installatie (Windows en Linux), inrichting en beheer, eerste, tweede en derde zitting
- simulatie proces met de applicatie
- vergelijking output OSV2020-U en Abacus
- performance: parallelle invoer, verkiezing met grote dataset, machine met erg beperkte resources
- importeren EML's: verkiezingsdefinitie, kandidatenlijsten, stembureaus
- beveiliging: autorisatiematrix, session timeout, airgap
- release build bevat geen ontwikkel-features

#### Sessies met gemeenten

Met ongeveer 15 gemeenten hebben we het volledige proces doorlopen, van configuratie tot en met de processen-verbaal P2a en Na 14-2. De reacties waren erg positief en gaven ook de nodige ideeën voor verdere verbeteringen.


### Beveiligingsonderzoek

In december 2025 heeft HackDefense een beveiligingsonderzoek uitgevoerd op Abacus v1.0.0. HackDefense is geselecteerd conform de geldende inkoopprocedure. Binnen de betreffende mantelovereenkomst voeren drie partijen deze onderzoeken roulerend uit. Voor de versie van Abacus die tijdens de gemeenteraadsverkiezingen wordt gebruikt, is dit HackDefense geweest.

In het onderzoek werden geen bevindingen gedaan met risico-inschatting "zeer hoog" of "hoog". In overleg is besloten om één bevinding met risico-inschatting "midden" en drie bevindingen met risico-inschatting "laag" op te lossen in v1.0.1.

Naast het oplossen van de vier bevindingen is in v1.0.1 de dependency "wasmi" geüpdatet van 0.51.2 to 0.51.5, omdat hierin een fix zit voor [CVE-2025-66627](https://github.com/advisories/GHSA-g4v2-cjqp-rfmq). Daarnaast zitten er nog enkele wijzigingen in v1.0.1 die geen impact hebben op de applicatie, zoals het oplossen van een flaky test.

Het [rapport van het beveiligingsonderzoek](https://www.kiesraad.nl/adviezen-en-publicaties/publicaties/2026/02/02/rapport-pentest-abacus---gr26) is beschikbaar op de site van de Kiesraad. Het volledig overzicht van de [verschillen tussen v1.0.0 en v1.0.1](https://github.com/kiesraad/abacus/compare/v1.0.0...v1.0.1) is te vinden op GitHub.


### Wettelijke toets

In de periode november 2025 tot januari 2026 heeft KPMG de wettelijke toets uitgevoerd op Abacus v1.0.0. De conclusie van het rapport is dat Abacus aan de wettelijke kaders van de Kieswet en het Kiesbesluit voldoet.

Het [rapport van de wettelijke toets](https://www.kiesraad.nl/adviezen-en-publicaties/publicaties/2026/02/02/toets-op-wettelijke-kaders-abacus-en-osv2020-u---gr26) is beschikbaar op de site van de Kiesraad.


## Aandachts- en verbeterpunten testproces

### Expliciet maken wanneer Abacus goed genoeg is

Tijdens de ontwikkeling is er regelmatig en uitgebreid met stakeholders en binnen het team gesproken over wat "goed genoeg" betekent. De uitkomsten van die gesprekken zijn echter nooit duidelijk vastgelegd. Voor de volgende release gaan we van tevoren expliciet uitwerken aan welke kwaliteitseisen de release moet voldoen en welke testactiviteiten hiervoor nodig zijn. Hiermee geven we ook opvolging aan het [advies hierover van het Adviescollege ICT-toetsing (AcICT)](https://github.com/kiesraad/abacus/tree/a1d4bf958a1038be5ea6e002f17fc800a67d45bb/documentatie/reviews/acict).

### Regelmatiger exploratief testen tijdens ontwikkeling

Het aantal bevindingen gevonden in het exploratief testen voor de release vinden we zelf te hoog. We zullen daarom regelmatig (bijv. maandelijks) exploratieve testsessies uitvoeren op recente wijzigingen aan de applicatie.

### Minder overlap release-testen en ontwikkeling

Zoals hierboven vermeld gebeurde een gedeelte van het release-testen parallel aan het afronden van de ontwikkeling. Hoewel we het regressie-risico dat dit met zich meebrengt goed hebben gemitigeerd, zullen we voor volgende releases die overlap beter beperken dan we voor deze release gedaan hebben.
