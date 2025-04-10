# Input- en output-bestanden Abacus

Het doel is dat Abacus zoveel mogelijk in de modellen invult en er dus zo weinig mogelijk met pen op de processen-verbaal (PV's) moet worden geschreven. 

## Open punten

### Vragen

- Klopt het dat de Na 14-1 versie 1 (DSO) gegenereerd moeten worden door Abacus?
- Hoe worden modellen die door Abacus worden gegenereerd afgedrukt? Waar staat de printer?
- Filteren we welke modellen gegenereerd kunnen worden o.b.v. DSO/CSO?
- Wordt Telling 510a (telling SB) ergens gebruikt of gegenereerd?
- Is de kandidatenlijst altijd een EML_NL 230b? Of is de kandidatenlijst voor sommige verkiezingen een EML_NL 210?
- Hoe stellen we de adresgegevens van de (verkozen) kandidaten beschikbaar, makkelijker dan d.m.v. totaallijst (EML_NL 230c)?

### Te doen

- Modellen nalopen: wat moet door Abacus worden ingevuld (blauwe tekst)? Wat niet?
- EML_NL bestanden nalopen: hebben we alle data voor de EML_NL bestanden?
- Titels/Namen van modellen bijwerken o.b.v. voorstel voor OSV.
- Welke bestanden genereert OSV? Klopt dat met wat we van plan zijn met Abacus?
  - Leeg EML_NL-bestand: Telling 510b
  - Totaaltelling 510d lijkt output van GSB, niet CSB. (te verifiëren)

---

## Verkiezingsgegevens

- verkiezingsdefinitie (EML_NL 110a)
  - wordt geïmporteerd in Abacus
- stembureaus (EML_NL 110b)
  - wordt geïmporteerd in Abacus
- kandidatenlijst (EML_NL 230b)
  - wordt geïmporteerd in Abacus
- totaallijst (EML_NL 230c)
  - niet gebruikt door Abacus
  - zie open punt over beschikbaar stellen van adresgegevens voor benoemings- en geloofsbrieven

---

## GSB

### Modellen

| Model(onderdeel)  | DSO  | CSO  | Doel                          | 'template' uit Abacus | input voor Abacus | output van Abacus |
| ----------------- | :--: | :--: | ----------------------------- | :-------------------: | :---------------: | :---------------: |
| N 10-1            |  X   |      | PV SB                         |                       |         X         |                   |
| Na 14-1 versie 1  |  X   |      | Corrigendum SB - 1ste zitting |         X(?)          |         X         |                   |
| N 10-2            |      |  X   | PV SB                         |                       |         X         |                   |
| Na 31-2 Bijlage 1 |      |  X   | PV SB                         |                       |         X         |                   |
| Na 31-2 Bijlage 2 |      |  X   | Bezwaren SB's                 |                       |                   |                   |
| Na 31-1           |  X   |      | PV GSB - 1ste zitting         |                       |                   |         X         |
| Na 31-2           |      |  X   | PV GSB - 1ste zitting         |                       |                   |         X         |
| Na 14-1 versie 2  |  X   |      | Corrigendum SB - 2de zitting  |           X           |         X         |                   |
| Na 14-2 Bijlage 1 |      |  X   | Corrigendum SB - 2de zitting  |           X           |         X         |                   |
| Na 14-2[^1]       |  X   |  X   | Corrigendum GSB - 2de zitting |                       |                   |         X         |
| P 2a[^2]          |  X   |  X   | Verslag 2de zitting           |                       |                   |         X         |

[^1]: NA 14-2 wordt alleen aangemaakt als hertellingen tot een ander resultaat leiden.
[^2]: P 2a wordt alleen aangemaakt als er een tweede zitting is.

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


#### P 2a (DSO en CSO): Verslag tweede zitting
- gegenereerd door Abacus
- input voor CSB (?)


### Tellingsbestanden

#### EML_NL

- Telling 510b
  - tellingen GSB en SB's
  - output van Abacus - GSB, input voor Abacus - CSB


#### CSV-bestand met tellingen

- niet in scope Abacus
- tellingen GSB en SB's
- Uitwisselplatform zal EML_NLs omzetten naar CSVs

---

## CSB

### Modellen

| Model(onderdeel) | DSO  | CSO  | Doel                          | input voor Abacus | output van Abacus |
| ---------------- | :--: | :--: | ----------------------------- | :---------------: | :---------------: |
| Na 31-1          |  X   |      | PV GSB - 1ste zitting         |         X         |                   |
| Na 31-2          |      |  X   | PV GSB - 1ste zitting         |         X         |                   |
| Na 14-2[^3]      |  X   |  X   | Corrigendum GSB - 2de zitting |         X         |                   |
| P 2a[^4]         |  X   |  X   | Verslag 2de zitting           |        ???        |                   |
| P 22-2           |  X   |  X   |                               |                   |         X         |

[^3]: Na 14-2 wordt alleen aangemaakt als hertellingen tot een ander resultaat leiden.
[^4]: P 2a wordt alleen aangemaakt als er een tweede zitting is.

#### P 22-2

- gegenereerd  door Abacus


### Benoemingsbrieven en geloofsbrieven

- niet in scope Abacus


### Tellingsbestanden

#### EML_NL

- Telling 510b
  - tellingen GSB en SB's
  - output van Abacus - GSB, input voor Abacus - CSB
- Totaaltelling 510d
  - tellingen GSB
  - output van Abacus - CSB
- Resultaat 520
  - verkozen kandidaten
  - output van Abacus - CSB
