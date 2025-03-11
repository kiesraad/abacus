# Testen en kwaliteit

## Uitgangspunten

- Kwaliteit is iets dat emergent is:
  - Het is het gevolg van vele kleine dingen die goed gedaan worden ("many small things done right")
  - Kwaliteit moet makkelijk genoeg zijn vanwege het ETTO-principe (Efficiency-Thoroughness Trade-Off principe)
- Kwaliteit en snelheid sluiten elkaar niet uit, maar gaan hand in hand:
  - Interne kwaliteit faciliteert snelheid, snelheid faciliteert feedback, feedback faciliteert externe kwaliteit
  - Interne kwaliteit: software als code; externe kwaliteit: software als product
- Testen is een proces van ontdekken en evalueren:
  - Ontdekken: wat doet het?
  - Evalueren: wat vinden we daarvan?
  - Dit levert inzicht op in waarde (voldoen aan verwachtingen) en in risico's (vervelende verrassingen)
- Testen gebeurt overal in het proces ("continuous testing") en beperkt zich niet tot de geschreven software, dus:
  - In alle fases: procesanalyse, ontwerp, bouw, releases, uitrol, beheer
  - Door verschillende personen en rollen
  - Zo veel mogelijk vermijden: grote validatiestappen aan het eind, als in "we zijn klaar, we moeten alleen nog testen"

## Kwaliteits- en testbeleid

### Zero bug policy

- Geldt zowel voor externe kwaliteit (product) als interne kwaliteit (code)
- Of het is goed genoeg, of we accepteren dat we het werk mogelijk nooit inplannen, dus:
  - Niet onderhandelen over kwaliteit door bugs aan de backlog toe te voegen of door een kwetsbaarhedenregister bij te houden
  - Vermijden van "normalization of deviance": "dit kan voor één keer" wordt "dit kan wel eens een keer" en vervolgens "dit kan wel"
  - Vermijden van "failure demand" (extra werk omdat het de eerste keer niet goed genoeg was): managen van je backlog/bevindingenregister kost uiteindelijk vrijwel altijd meer tijd en energie dan gelijk oplossen

Voor de praktische uitwerking van de policy, zie ["Uitwerking zero bug policy"](/documentatie/ontwikkelproces/zero-bug-policy.md).

### Vroege feedback en end-to-end feedback

- Vroege feedback:
  - Feedback op waar je op dat moment mee bezig bent is beter dan feedback op wat je vorige week aan het doen was
  - Dus ontwikkelen in dunne "slices" (zo klein mogelijke scope)
- End-to-end feedback:
  - Feedback op een feature is rijker dan feedback op een component
  - Dus ontwikkelen in verticale "slices" (feature over componenten heen), niet in horizontale "slices" (feature component per component bouwen)
- Gefaciliteerd door:
  - Iteratief en incrementeel ontwikkelen
  - CI/CD (zie "Kwaliteits- en testprogramma")

## Kwaliteitsattributen

We gebruiken deze kwaliteitscriteria om ons werk te toetsen. Ze sluiten aan op de waarborgen uit het verkiezingsproces:

- Betrouwbaarheid: kun je de software in de meeste situaties vertrouwen?
- Bruikbaarheid: is de software makkelijk te gebruiken? (voor alle bedoelde gebruikers, dus ook installatie, controleerbaar door burger, etc.)
- Beveiliging: biedt de software voldoende bescherming tegen ongewenst gebruik?
- Testbaarheid: is het eenvoudig om de software te testen en controleren?
- Onderhoudbaarheid: kan de software eenvoudig worden onderhouden en aangepast?
- IT-bility: is de software eenvoudig te installeren, onderhouden en ondersteunen? Dit criterium overlapt met Bruikbaarheid, Testbaarheid en Onderhoudbaarheid en is belangrijk genoeg om ook expliciet te vermelden.

## Kwaliteits- en testprogramma

| Wanneer            | Hoe vaak        | Wie                                            | Wat                                                                                 |
|--------------------|-----------------|------------------------------------------------|-------------------------------------------------------------------------------------|
| ontwikkeling       | continu         | ontwikkelteam                                  | permanente reviews van code en documentatie, handmatig en automatisch testen, CI/CD |
| ontwikkeling       | continu         | externe tools                                  | permanente analyse van code kwaliteit en testcoverage                               | 
| ontwikkeling       | regelmatig      | stakeholders Kiesraad                          | feedback op applicatie en documentatie                                              |
| tussentijds        | te bepalen      | externe stakeholders, externe geïnteresseerden | feedback op code, applicatie en documentatie                                        |
| oefen-release      | elk half jaar   | externe partijen                               | code review, pentest                                                                |
| verkiezingsrelease | elke verkiezing | externe partijen                               | code review, pentest, toetsing wettelijke kaders                                    |

### Ontwikkelteam

#### Vierogenprincipe

- Om te vermijden dat fouten of ongewenste functionaliteit (backdoors, manipuleren verkiezingsresultaten, lekken informatie) op de main branch komen, wordt elke codewijziging hierop gereviewd door twee verschillende personen vóórdat deze naar main gemerged wordt.

#### Permanente code reviews

- Kleine PR's, het doel is dat PR's 1-3 dagen open staan.
  - Voor CI (continuous integration, zie hieronder) moet dit strict gezien minder dan 1 dag zijn. Dat is in de praktijk erg lastig, vandaar de 1-3 dagen.
- één ticket/taak mag in meerdere PR's gebouwd worden.
- Pair/ensemble programming telt als review.
- Vraag vroeg om feedback: [editing over proof-reading](https://buttondown.email/hillelwayne/archive/code-review-vs-code-proofreading/) (Hillel Wayne)
- Zoveel mogelijk afvangen d.m.v. linting, static code analysis, codekwaliteit en testcoverage zodat menselijke code review kan focussen op architectuur e.d.

#### Handmatige tests en automatische tests

- Handmatig en automatisch testen gaan samen ("contemporary exploratory testing"), dus niet eerst handmatig testen en het dan automatiseren.
- Artefacten zoals testautomatisering, test cases, etc. zijn het resultaat van testen, niet de input.

#### Continuous Integration / Continuous Delivery (CI/CD)

- CI: risico's mitigeren bij het integreren van code door dit continu te doen.
  - Ideaal: elke developer integreert eigen code minstens één keer per dag met de gedeelde branch.
- CD: risico's mitigeren bij het opleveren van een installeerbaar product door dit continu te doen.
  - De pipeline resulteert in een installeerbare en werkende applicatie.
- Dus er is een CI/CD-pipeline nodig met quality gates (nog niet alle gates zijn geïmplementeerd):
  - Linting
  - Static code analysis
  - Unit tests
  - Integration tests
  - End-to-end tests
  - Security scan
  - Codekwaliteit
  - Test coverage
  - Performance test
  - Installeerbaarheidstest
- Op zijn minst de volgende quality gates kunnen ook lokaal gedraaid worden: linting, unit tests, integration tests, end-to-end tests.
- Feedback van de pipeline is snel genoeg, ambitie is binnen 5-10 minuten op zijn minst feedback te hebben van linting, static code analysis, unit tests, integration tests, e2e tests, security scan.

### Interne stakeholders

- Frequentie: regelmatig
- Doel:
  - Feedback ophalen van interne stakeholders Kiesraad
- Scope:
  - Juridische kaders
  - Hallway test
  - ...
- Faciliteren door:
  - Het organiseren van demo's
  - Het beschikbaar maken van de front-end met een mock service
  - Het beschikbaar maken van code, builds en releases op GitHub

### Externe stakeholders

- Frequentie: te bepalen
- Doel:
  - Feedback ophalen van externe stakeholders, bijv. gemeentes
  - Feedback ophalen van externe geïnteresseerden, bijv. betrokken burgers, maar ook de community van experts (programmeren, testen)
- Faciliteren door:
  - Het uitvoeren van kleinschalige gebruikerstests
  - Het organiseren van sessies om feedback op te halen
  - Het beschikbaar maken van code, builds en releases op GitHub

### Oefen-verkiezingsrelease

- Frequentie: elke half jaar
- Doel:
  - Vaker feedback ontvangen dan alleen bij verkiezingen
  - Routine opbouwen in releaseproces
- Scope:
  - Externe code review
  - Externe pentests

### Verkiezingsrelease

- Frequentie: elke verkiezingen
- Doel: verkiezingen
- Scope:
  - Externe code review
  - Externe pentests
  - Toetsing wettelijke kaders

## Documentatie

### Kwaliteitsvereisten

- Doelgroep: de inhoud en het niveau van de documentatie worden afgestemd op de kennis en behoeften van de doelgroep. Zo zijn gebruikershandleidingen zo eenvoudig mogelijk opgesteld en kan interne documentatie meer technisch van aard zijn.
- Duidelijk en helder taalgebruik: we gebruiken niet te ingewikkelde termen en niet te veel acroniemen. Technische termen worden waar mogelijk uitgelegd.
- Indeling: we zorgen voor een consistente indeling van alle documenten.
- Afbeeldingen: we gebruiken diagrammen, screenshots en andere afbeeldingen om zaken inzichtelijk te maken.
- Sjablonen: waar mogelijk gebruiken we standaard sjablonen voor verschillende documenttypen. Ook dit bevordert de consistentie.
- Versiebeheer: documenten moeten zijn voorzien van versiebeheer. Dit kan er verschillend uitzien op verschillende systemen. Bij wijzigingen wordt de versie opgehoogd.

### Controle en testen

- Vierogenprincipe: om malafide wijzigingen te voorkomen, wordt elke toevoeging/wijziging gecontroleerd voordat deze gemerged wordt.
- Reviews: alle documentatie wordt gecontroleerd en geredigeerd door een of meer relevante medewerkers (developer/tester/projectleider).
- Testen met en feedback van gebruikers: bij de gebruikerstesten met de software is het ook zaak dat de kwaliteit van de documentatie wordt getest, zodat eventuele fouten kunnen worden gecorrigeerd en onduidelijkheden kunnen worden opgehelderd. We nemen feedback van gebruikers ook mee.
