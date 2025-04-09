# Input- en output-bestanden Abacus

TODO: check/fix links to this doc
TODO: .zip met EML_NL en pdf?
TODO: s/PV/Tellingen want een Bijlage is geen PV
TODO: EML_NL bestanden van GSB en CSB
TODO: vermelden niet in scope: csv met tellingen in digitaal bestand (doet uitwisselplatform)

---

Het doel is dat Abacus zoveel mogelijk in de modellen invult en er dus zo weinig mogelijk met pen op de PV's moet worden geschreven. 


## Open punten
- Klopt het dat de Na 14-1 versie 1 (DSO) gegenereerd moeten worden door Abacus?
- Modellen nalopen: wat moet door Abacus worden ingevuld (blauwe tekst)? wat niet?
- EML_NL bestanden nalopen: hebben we alle data voor de EML_NL bestanden?
- Titels/Namen van modellen bijwerken o.b.v. voorstel voor OSV.
- Welke bestanden genereert OSV? Klopt dat met wat we van plan zijn met Abacus?
- Hoe worden modellen die door Abacus worden gegenereerd afgedrukt? Waar staat de printer?
- Filteren we welke modellen gegenereerd kunnen worden o.b.v. DSO/CSO?


## Verkiezingsgegevens

- verkiezingsdefinitie (EML_NL)
- kandidatenlijst (EML_NL)
- stembureaus (EML_NL)

## GSB

### Modellen

| Model(onderdeel)  | DSO  | CSO  | Doel                          | 'template' uit Abacus | input voor Abacus | output van Abacus |
| ----------------- | :--: | :--: | ----------------------------- | :-------------------: | :---------------: | :---------------: |
| N 10-1            |  X   |      | PV SB                         |                       |         X         |                   |
| Na 14-1 versie 1  |  X   |      | Corrigendum SB - 1ste zitting |         X (?)         |         X         |                   |
| N 10-2            |      |  X   | PV SB                         |                       |         X         |                   |
| Na 31-2 Bijlage 1 |      |  X   | PV SB                         |                       |         X         |                   |
| Na 31-2 Bijlage 2 |      |  X   | Bezwaren SB's                 |                       |                   |                   |
| Na 31-1           |  X   |      | PV GSB - 1ste zitting         |                       |                   |         X         |
| Na 31-2           |      |  X   | PV GSB - 1ste zitting         |                       |                   |         X         |
| Na 14-1 versie 2  |  X   |      | Corrigendum SB - 2de zitting  |           X           |         X         |                   |
| Na 14-2 Bijlage 1 |      |  X   | Corrigendum SB - 2de zitting  |           X           |         X         |                   |
| Na 14-2           |  X   |  X   | Corrigendum GSB - 2de zitting |                       |                   |         X         |
| P 2a              |  X   |  X   | Verslag 2de zitting           |                       |                   |         X         |

#### N 10-1 (DSO) en N 10-2 (CSO): PV op SB-niveau
- door gemeente ruim op voorhand aangemaakt met eigen huisstijl, voorblad, etc.
- worden met de hand ingevuld en dan ingevoerd in Abacus


#### Na 14-1 versie 1 (DSO): Corrigendum eerste zitting
- wordt gegenereerd door Abacus, met de hand ingevuld, dan ingevoerd in Abacus


#### Na 31-2 Bijlage 1 (CSO): PV op SB-niveau
- door gemeente ruim op voorhand aangemaakt met eigen huisstijl, voorblad, etc.
- worden met de hand ingevuld en dan ingevoerd in Abacus


#### Na 31-2 Bijlage 2 (CSO): Bezwaren SB's
- niet gegenereerd door Abacus; uit toolkit?
- typist (niet invoerder) neemt deze over van SB PV's, buiten Abacus om


#### Na 31-1 (DSO) en Na 31-2 (CSO): PV op GSB-niveau voor eerste zitting
- gegenereerd door Abacus

#### Na 14-1 versie 2 (DSO): Corrigendum op SB-niveau
- gegenereerd door Abacus met resultaten vorige telling ingevuld
- opdracht invoeren, genereren, handmatig invullen, resultaten (wel of niet hertelling), in Abacus invoeren
- worden ingevuld en dan ingevoerd in Abacus


#### Na 14-2 Bijlage 1 (CSO): Corrigendum op SB-niveau
- gegenereerd door Abacus met resultaten vorige telling ingevuld
- opdracht invoeren, genereren, handmatig invullen, resultaten (wel of niet hertelling), in Abacus invoeren
- worden ingevuld en dan ingevoerd in Abacus


#### Na 14-2 (DSO en CSO): Corrigendum op GSB-niveau voor tweede zitting
- gegenereerd door Abacus, alleen als hertellingen tot een ander resultaat leidden
- input voor CSB

- structuur
  - Deel 1 – Gecorrigeerde telresultaten van de gemeente/het openbaar lichaam
  - Deel 2 – Ondertekening
  - Bijlage 1 Verslagen van tellingen van stembureaus die zijn herteld door het gemeentelijk stembureau/stembureau voor het openbaar lichaam


#### P 2a (DSO en CSO): Verslag tweede zitting
- gegenereerd door Abacus
- input voor CSB (?)

### Tellingsbestanden

#### EML_NL

#### CSV

niet in scope


## CSB

### Modellen

#### P 22-2

- gegenereerd  door Abacus

### Benoemingsbrieven etc.

- niet uit Abacus
- hoe adresgegevens uit totaallijst (EML_NL) naar csv o.i.d.?
  - technische oplossing nog te bepalen
  - issue 288

### Tellingsbestanden

#### EML_NL
