# Input- en output-bestanden Abacus

Dit document geeft een overzicht van alle input- en output-bestanden die relevant zijn voor Abacus. Voor een gedetailleerd overzicht van hoe de modellen gebruikt worden in combinatie met Abacus, zie ["Overzicht modellen en Abacus"](./overzicht-modellen.md). Dit overzicht linkt door naar de relevante details per model.

## Open punten

- Hoe stellen we de adresgegevens van de (verkozen) kandidaten beschikbaar, makkelijker dan d.m.v. de totaallijst (EML_NL 230c)? Deze gegevens zijn nodig voor het opstellen van de benoemings- en geloofsbrieven.
- Als er een hertelling gebeurt n.a.v. een verzoek van het CSB of van het vertegenwoordigend lichaam, leidt dit dan op stembureau-niveau tot een corrigendum of tot een volledig nieuw tellings-PV?

## Genereren van documenten door Abacus

- Abacus vult de documenten zoveel mogelijk in, zodat er zo weinig mogelijk met pen op de processen-verbaal (PV's) moet worden geschreven.
- Abacus moet alle documenten volgens de modellen kunnen genereren. Ofwel als 'leeg' document (in te vullen met de hand) of als ingevuld document (ingevuld door Abacus). In de tabellen hieronder zijn dit respectievelijk de kolommen *'leeg' document uit Abacus* en *output van Abacus*.
- Alleen de documenten die overeenkomen met het ingestelde type stemopneming (DSO of CSO) kunnen gegenereerd worden voor een verkiezing.
- Het is niet noodzakelijk om te beperken op welk moment bepaalde 'lege' documenten gegenereerd kunnen worden, zolang het onderscheid tussen de verschillende documenten duidelijk is voor gebruikers.
- Het is niet noodzakelijk om onderscheid te maken tussen beheerders, coördinatoren GSB en coördinatoren CSB voor wie welke 'lege' documenten mag genereren.

## Verkiezingsgegevens

- verkiezingsdefinitie (EML_NL 110a)
  - wordt geïmporteerd in Abacus
- stembureaus (EML_NL 110b)
  - wordt geïmporteerd in Abacus
  - kan ook geëxporteerd worden
- kandidatenlijsten (EML_NL 230b)
  - wordt geïmporteerd in Abacus
- totaallijst (EML_NL 230c)
  - niet gebruikt door Abacus
  - zie open punt over beschikbaar stellen van adresgegevens voor benoemings- en geloofsbrieven

EML_NL 210 (kandidatenlijst voor een politieke groepering) wordt niet gebruikt, want alleen relevant binnen het kandidaatstellingsproces.

## GSB

### Documenten

| Model(onderdeel)  | DSO | CSO | Doel                                | 'leeg' document uit Abacus | input voor Abacus | output van Abacus |
|-------------------|:---:|:---:|-------------------------------------|:--------------------------:|:-----------------:|:-----------------:|
| N 10-1            |  X  |     | PV SB                               |             X              |         X         |                   |
| Na 14-1 versie 1  |  X  |     | Corrigendum SB - eerste zitting     |             X              |         X         |                   |
| N 10-2            |     |  X  | PV SB                               |             X              |                   |                   |
| N 5               |  X  |  X  | Overdrachtsdocument GSB             |                            |                   |                   |
| Na 31-2 Bijlage 1 |     |  X  | Telresultaten SB                    |             X              |         X         |                   |
| Na 31-2 Bijlage 2 |     |  X  | Bezwaren SB's                       |                            |                   |                   |
| Na 31-1           |  X  |     | PV GSB - eerste zitting             |                            |                   |         X         |
| Na 31-2           |     |  X  | PV GSB - eerste zitting             |                            |                   |         X         |
| Na 14-1 versie 2  |  X  |     | Corrigendum SB - volgende zitting   |             X              |         X         |                   |
| Na 14-2 Bijlage 1 |     |  X  | Corrigendum SB - volgende zitting   |             X              |         X         |                   |
| Na 14-2           |  X  |  X  | Corrigendum GSB - volgende zitting  |                            |                   |         X         |
| P 2a              |  X  |  X  | Verslag volgende zitting            |                            |                   |         X         |
| Na 31-2 Inlegvel  |     |  X  | Inlegvel n.a.v. controle i.o.v. CSB |             X              |                   |                   |

#### N 10-1 (DSO) en N 10-2 (CSO): PV op SB-niveau

- door grotere gemeenten vaak op voorhand aangemaakt met eigen huisstijl, voorblad, etc.
- voor kleinere gemeenten wel 'leeg' laten genereren door Abacus
- worden met de hand ingevuld en dan ingevoerd in Abacus

#### Na 14-1 versie 1 (DSO): Corrigendum eerste zitting

- wordt 'leeg' gegenereerd door Abacus, met de hand ingevuld, dan ingevoerd in Abacus

#### N5: Overdrachtsdocument GSB

- niet gegenereerd door Abacus; uit verkiezingentoolkit of door gemeente zelf gemaakt
- document voor de overdracht van de stembescheiden van de burgemeester aan het GSB

#### Na 31-2 Bijlage 1 (CSO): Telresultaten op SB-niveau

- door grotere gemeenten vaak op voorhand aangemaakt met eigen huisstijl, voorblad, etc.
- voor kleinere gemeenten wel 'leeg' laten genereren door Abacus
- worden met de hand ingevuld en dan ingevoerd in Abacus

#### Na 31-2 Bijlage 2 (CSO): Bezwaren SB's

- niet gegenereerd door Abacus; uit verkiezingentoolkit of door gemeente zelf gemaakt
- typist (niet invoerder) neemt deze over van SB PV's, buiten Abacus om

#### Na 31-1 (DSO) en Na 31-2 (CSO): PV op GSB-niveau voor eerste zitting

- gegenereerd door Abacus

#### Na 14-1 versie 2 (DSO): Corrigendum op SB-niveau voor volgende zitting

- gegenereerd door Abacus met aanleiding van het onderzoek en resultaten vorige telling gevuld
- wordt afgedrukt en handmatig ingevuld met resultaten onderzoek en eventuele hertelling, dan ingevoerd in Abacus

#### Na 14-2 Bijlage 1 (CSO): Corrigendum op SB-niveau voor volgende zitting

- gegenereerd door Abacus met aanleiding van het onderzoek en resultaten vorige telling gevuld
- wordt afgedrukt en handmatig ingevuld met resultaten onderzoek en eventuele hertelling, dan ingevoerd in Abacus

#### Na 14-2 (DSO en CSO): Corrigendum op GSB-niveau voor volgende zitting

- gegenereerd door Abacus, alleen als hertellingen tot een ander resultaat leidden
- input voor CSB

#### P 2a (DSO en CSO): Verslag volgende zitting

- gegenereerd door Abacus, alleen als er een volgende zitting is

#### Na 31-2 Inlegvel (CSO): Inlegvel PV GSB eerste zitting n.a.v. controles in opdracht van CSB

- lege versie gegenereerd door Abacus voor een tweede (en alleen tweede) zitting
- wordt toegevoegd aan Na 31-2 om aan te geven dat het GSB een onderzoek heeft uitgevoerd en of er wel/geen gecorrigeerde telresultaten zijn


### Tellingsbestanden

#### EML_NL

- Telling 510b: tellingen GSB en SB's
  - output van Abacus - GSB
  - input voor Abacus - CSB
  - mogelijk input voor Abacus - GSB, als de telresultaten van de vorige zitting niet meer beschikbaar zijn in Abacus

EML_NL 510a (tellingsbestand stembureau) wordt niet gebruikt.


#### CSV-bestand met tellingen

- niet in scope Abacus
- tellingen GSB en SB's
- worden gepubliceerd op de gemeentewebsite

### Naamgeving documenten

#### Eerste zitting

- `definitieve-documenten_gr2026_gemeentenaam_gemeente_gemeente-naam-jjjjmmdd-uummss.zip`
  - `Model_Na31-2.pdf`
  - `Telling_GR2026_GemeenteNaam.zip`
    - `Telling_GR2026_GemeenteNaam.eml.xml`

#### Volgende zitting

- `correctie_gr2026_gemeentenaam_gemeente_gemeente-naam-jjjjmmdd-uummss.zip`
  - `Leeg_Model_P2a.pdf`
  - `Model_Na14-2.pdf` (als corrigendum)
  - `Telling_GR2026_GemeenteNaam.zip` (als corrigendum)
    - `Telling_GR2026_GemeenteNaam.eml.xml`

## CSB

### Documenten

| Model(onderdeel)   | DSO | CSO | Doel                               | input voor Abacus | output van Abacus |
|--------------------|:---:|:---:|------------------------------------|:-----------------:|:-----------------:|
| Na 31-1            |  X  |     | PV GSB - 1ste zitting              |         X         |                   |
| Na 31-2            |     |  X  | PV GSB - 1ste zitting              |         X         |                   |
| Na 14-2            |  X  |  X  | Corrigendum GSB - 2de zitting      |         X         |                   |
| P 2a               |  X  |  X  | Verslag 2de zitting GSB            |                   |                   |
| P 22-2             |  X  |  X  | PV CSB - einduitslag               |                   |         X         |
| P 22-2 sectie 2.11 |  X  |  X  | PV CSB - hertelling n.a.v. bezwaar |                   |        ???        |

#### P 22-2: einduitslag CSB

- gegenereerd door Abacus

#### P 22-2 sectie 2.11 Hertelling

- open punt of gegenereerd door Abacus
- twee varianten:
  - hertelling maar geen wijziging in zetelverdeling: aangevuld met 2.3 t/m 2.5 o.b.v nieuwe telling
  - hertelling en wijziging in zetelverdeling: aangevuld met 2.3 t/m 2.10 o.b.v nieuwe telling
- alleen relevant bij een hertelling n.a.v. bezwaar tijdens zitting CSB
  - dus niet bij terugverwijzing door CSB vóór invoer in Abacus
  - dus niet bij hertelling op verzoek van gemeenteraad ([Artikel V 4a Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingIV_HoofdstukV_Paragraaf1_ArtikelV4a))

### Benoemingsbrieven en geloofsbrieven

- niet in scope Abacus
- zie open punt over beschikbaar stellen van adresgegevens voor benoemings- en geloofsbrieven

### Tellingsbestanden

#### EML_NL

- Telling 510b: tellingen GSB en SB's
  - output van Abacus - GSB
  - input voor Abacus - CSB
- Totaaltelling 510d: tellingen GSB
  - output van Abacus - CSB
- Resultaat 520: verkozen kandidaten
  - output van Abacus - CSB

EML_NL 510c (tellingsbestand hoofdstembureau) wordt niet gebruikt binnen de huidige scope, namelijk gemeenteraadsverkiezingen.
