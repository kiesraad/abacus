# Testen en kwaliteit

## Uitgangspunten
- Kwaliteit is iets emergent
	- gevolg van vele kleine dingen die goed gedaan worden ("many small things done right")
	- kwaliteit moet makkelijk genoeg zijn, vanwege het ETTO-principe (Efficiency-Thoroughness Trade-Off principe)
- Kwaliteit en snelheid sluiten elkaar niet uit, maar gaan hand in hand
	- interne kwaliteit faciliteert snelheid faciliteert feedback faciliteert externe kwaliteit
	- interne kwaliteit: software als code; externe kwaliteit: software als product
- Testen is een proces van ontdekken en evalueren
	- ontdekken: wat doet het?
	- evalueren: wat vinden we daarvan?
	- dit levert inzicht op in waarde (voldoen aan verwachtingen) en in risico's (vervelende verrassingen)
- Testen gebeurt overal in het proces ("continuous testing") en beperkt zich niet tot de geschreven software
	- dus in alle fases: procesanalyse, ontwerp, bouw, releases, uitrol, beheer
	- dus door verschillende personen en rollen
	- zo veel mogelijk vermijden: grote validatiestappen aan het eind, als in "we zijn klaar, we moeten alleen nog testen"


## Kwaliteits- en testbeleid

### Zero bug policy
- Geldt zowel voor externe kwaliteit (product) als interne kwaliteit (code)
- Of het is goed genoeg, of we accepteren dat we het werk mogelijk nooit inplannen
	- niet onderhandelen over kwaliteit door bugs aan de backlog toe te voegen of door een kwetsbaarhedenregister bij te houden
	- vermijden van "normalization of deviance": "dit kan voor één keer" wordt "dit kan wel eens een keer" wordt "dit kan wel"
	- vermijden van "failure demand" (extra werk omdat het de eerste keer niet goed genoeg was): managen van je backlog/bevindingenregister kost uiteindelijk vrijwel altijd meer dan gelijk oplossen

### Vroege feedback en end-to-end feedback
- Vroege feedback
	- feedback op waar je op dat moment mee bezig bent is beter dan feedback op wat je vorige week was aan het doen
	- dus ontwikkelen in dunne "slices" (zo klein mogelijke scope)
- End-to-end feedback
	- feedback op een feature is rijker dan feedback op een component
	- dus ontwikkelen in verticale "slices" (feature over componenten heen), niet in horizontale "slices" (feature component per component bouwen)
- Gefaciliteerd door
	- iteratief en incrementeel ontwikkelen
	- CI/CD (zie "Kwaliteits- en testprogramma")


## Kwaliteitsattributen

We hebben kwaliteitscriteria gekozen om ons werk tegen te toetsen, aansluitend op de waarborgen uit het verkiezingsproces:

-   Betrouwbaarheid. Kun je de software in de meeste situaties vertrouwen?
-   Bruikbaarheid. Is de software makkelijk te gebruiken? (voor alle bedoelde gebruikers, dus ook installatie, controleerbaar door burger, etc)
-   Beveiliging. Biedt de software voldoende bescherming tegen ongewenst gebruik?
-   Testbaarheid. Is het eenvoudig om de software te testen en controleren?
-   Onderhoudbaarheid. Kan de software eenvoudig worden onderhouden en aangepast?
-   IT-bility (Is de software eenvoudig te installeren, onderhouden en ondersteunen?) overlapt met Bruikbaarheid, Testbaarheid en Onderhoudbaarheid en is belangrijk genoeg om ook expliciet te vermelden.


## Kwaliteits- en testprogramma

| Wannneer           | Hoe vaak        | Wie                   | Wat    |
| ------------------ | --------------- | --------------------- | ------ |
| ontwikkeling       | continu         | ontwikkelteam         | permanente reviews van code en documentatie, handmatig en automatisch testen, CI/CD |
| ontwikkeling       | regelmatig      | stakeholders Kiesraad | feedback op applicatie en documentatie |
| tussentijds        | te bepalen      | externe stakeholders, externe geïnteresseerden | feedback op code, applicatie en documentatie |
| oefen-release      | elk half jaar   | externe partijen      | code review, pentest |
| verkiezingsrelease | elke verkiezing | externe partijen      | code review, pentest, toetsing wettelijke kaders |

### Ontwikkelteam

#### Vier-ogen principe
- Om te vermijden dat fouten of ongewenste functionaliteit (backdoors, manipuleren verkiezingsresultaten, lekken informatie) op de main branch komen, wordt elke code-wijziging hierop gereviewd vóórdat deze naar main gemerged wordt

#### Permanente code reviews
- kleine PRs, doel 1-3 dagen open
	- Voor CI (continous integration, zie hieronder) moet dit strict gezien minder dan 1 dag zijn. Dat is in de praktijk erg lastig, vandaar de 1-3 dagen.
- één ticket/taak mag in meerdere PRs gebouwd worden
- pair/ensemble programmen telt als review
- vraag vroeg feedback op je design wanneer nodig: [editing over proof-reading](https://buttondown.email/hillelwayne/archive/code-review-vs-code-proofreading/) (Hillel Wayne)
- zoveel mogelijk afvangen dmv linting en static code analysis, zodat menselijke code review kan focusen op design e.d.

#### Handmatige tests en automatische tests
- handmatig en automatisch testen gaan samen ("contemporary exploratory testing")
- niet: eerst handmatig testen en het dan automatiseren
- artefacten zoals testautomatisering, test cases, etc zijn het resultaat van testen, niet de input

#### Continuous Integration / Continous Delivery (CI/CD)
- CI: mitigeren risico integreren code door het continu te doen
	- ideaal: elke developer intregreert eigen code minstens één keer per dag met gedeelde branch
- CD: mitigeren risico opleveren installeerbaar product door het continu te doen
	- pipeline resulteert in installeerbare en werkende applicatie
- Dus CI/CD pipeline nodig met quality gates (nog niet alle geïmplementeerd):
	- linting
	- static code anlysis
	- unit tests
	- integration tests
	- e2e tests
	- security scan
	- performance test
	- installeerbaarheidstest
- Op zijn minst de volgende quality gates kunnen ook lokaal gedraaid worden: linting, unit tests, integration tests, e2e tests
- Feedback van de pipeline is snel genoeg, ambitie is binnen 5-10 minuten op zijn minst feedback te hebben van linting, static code analysis, unit tests,
  integration tests, e2e tests, security scan

### Interne stakeholders
- Frequentie: regelmatig
- Doel:
	- feedback ophalen van interne stakeholders Kiesraad
- Scope:
	- juridische kaders
	- hallway test
	- ...
- Faciliteren door:
	- demos
	- beschikbaar maken front-end met mock service
	- code, builds en releases beschikbaar op GitHub

### Externe stakeholders
- Frequentie: te bepalen
- Doel:
	- feedback ophalen van externe stakeholders, bijv gemeentes
	- feedback ophalen van externe geïnteresseerden, bijv betrokken burgers maar ook community van experts (programmeren, testen)
- Faciliteren door:
	- kleinschalige gebruikerstests
	- organiseren sessies voor ophalen feedback
	- code, builds en releases beschikbaar op GitHub

### Oefen-verkiezingsrelease
- Frequentie: elke half jaar
- Doel:
	- vaker feedback dan alleen bij verkiezingen
	- routine opbouwen in release-proces
- Scope:
	- externe code review
	- externe pentests

### Verkiezingsrelease
- Frequentie: elke verkiezingen
- Doel: verkiezingen
- Scope:
	- externe code review
	- externe pentests
	- toetsing wettelijke kaders


## Documentatie

### Kwaliteitsvereisten

- Doelgroep: de inhoud en het niveau van de documentatie worden afgestemd op de kennis en behoeften van de doelgroep. Zo zijn gebruikershandleidingen zo eenvoudig mogelijk opgesteld en kan interne documentatie meer technisch van aard zijn.
- Duidelijk en helder taalgebruik: we gebruiken niet te ingewikkelde termen en niet te veel acroniemen. Technische termen worden waar mogelijk uitgelegd.
- Indeling: we zorgen voor een consistente indeling van alle documenten.
- Afbeeldingen: we gebruiken diagrammen, screenshots en andere afbeeldingen om zaken inzichtelijk te maken.
- Sjablonen: waar mogelijk gebruiken we standaard sjablonen voor verschillende documenttypen. Ook dit bevordert de consistentie.
- Versiebeheer: documenten moeten zijn voorzien van versiebeheer. Dit kan er verschillend uitzien op verschillende systemen. Bij wijzigingen wordt de versie opgehoogd.

### Controle en testen

- Vier-ogenprincipe: om malafide wijzigingen te voorkomen, wordt elke toevoeging/wijziging gecontroleerd voordat deze gemerged wordt.
- Reviews: alle documentatie wordt gecontroleerd en geredigeerd door een of meer relevante medewerkers (developer/tester/projectleider).
- Testen met en feedback van gebruikers: bij de gebruikerstesten met de software is het ook zaak dat de kwaliteit van de documentatie wordt getest, zodat eventuele fouten kunnen worden gecorrigeerd en onduidelijkheden kunnen worden opgehelderd. We nemen feedback van gebruikers ook mee.
