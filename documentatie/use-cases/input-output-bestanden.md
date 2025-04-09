# Input- en output-bestanden applicatie

TODO: afstemmen met Lodewijk Melanie

TODO: modellen nalopen op de afzonderlijke elementen, controleren: uit software is blauw, ergens anders vandaan is groen

​	! zoveel mogelijk door Abacus laten invullen

TODO: namen worden anders, zie mail met Excel in bijlage



## Input - verkiezing

- verkiezingsdefinitie (EML_NL)
- kandidatenlijst (EML_NL)
- stembureaus (EML_NL)


## GSB

- 'lege' PVs op SB-niveau
  - N 10-1 (DSO) en N10-2 (CSO)
  - weinig of zelfs niet gebruikt
  - zelf maken met toolkit, aan leverancier/drukkers vragen
  - gemeentehuisstijl, voorblad, etc dus door Abacus genereren is altijd sub-optimaal
  - OSV genereert dit waarschijnlijk wel, want tabel namen (TODO: bevestigen)
  - niet kern van software, dus niet doen zelfs als OSV dit wel doet
  - worden ingevuld en dan ingevoerd in Abacus
- 'leeg' SB-corrigendum eerste zitting (Na 14-1 versie 1)
  - genereren door Abacus, afrdukken, invullen, invoeren in Abacus
  - hoe afdrukken? printer aan Abacus-server?
  - TODO: of elders genereren obv toolkit? -> technisch projectleider DSO-gemeente of Lodewijk
  - moet wel zeker kunnen, OSV doet het ook, alleen zichtbaar voor CSO-gemeentes?
- 'leeg' SB-corrigendum nieuwe zitting (Na 14-1 versie 2 of Na 14-2 bijlage 1)
  - genereren door Abacus
  - versie 2 en bijlage 1 met aantallen oorspr. telling, opdracht
  - worden ingevuld en dan ingevoerd in Abacus
- CSO: Bijlage 1 van Na 31-2
  - niet uit Abacus
  - groene tekst! ipv blauw
  - voorbereid door gemeentes
  - zelfde 'functie' als N 10-1 van DSO
  - ingevuld en ingevoerd in Abacus
  - wordt samengevoegd met Na31-2 die gegenereerd wordt door Abacus en met Bijlage 2
- CSO: Bijlage 2 van Na 31-2
  - overgenomen van SB PV's door typist (niet invoerder)
  - maakt bijlage zelf
- PVs op GSB-niveau eerste zitting
  - gegenereerd door Abacus obv invoer
  - Na 31-1 (DSO) en Na 31-2 (CSO)
  - CSO: Bijlage 1 bij Na 31-2 met resultaten SB komen uit Abacus ???
  - gaat naar CSB
- GSB-corrigendum
  - gegenereerd door Abacus obv invoer van Na14-1 versie 2 (DSO) of Na 14-2 bijlage 1 (CSO)
  - optioneel, alleen als SBs met ander resultaat
  - Na 14-2
  - gaat naar CSB
- verslag tweede zitting
  - gegenereerd door Abacus obv invoer
  - P 2a
  - gaan naar CSB
- EML_NL bestanden



## CSB

- P 22-2
  - gegenereerd  door Abacus
- EML_NL bestanden



---

### Input voor GSB

- CSO: ...
- DSO: ...

### Output voor eigen proces (GSB)

- DSO: 'leeg' corrigendum PV SB (Na 14-1)
  - minimale optie: gemeente, stembureau en kandidatenlijsten (keuze welke lijsten)
  - uitgebreide optie: ook oorspronkelijke telresultaten PV SB
- ...

### Output voor CSB

- PV
  - ... (nog aan te vullen)
  - Bijlage voor ondertekenen PV
- Digitaal bestand (`.zip`-bestand)
  - EML_NL (enige verplichte onderdeel), PV als pdf

### Niet in scope

- csv met tellingen in digitaal bestand (doet uitwisselplatform)


## CSB

- van totaallijst (EML_NL) naar csv o.i.d. voor benoemingsbrieven e.d.
  - technische oplossing nog te bepalen
  - issue 288

### Input voor CSB

- ...

### Output voor eigen proces (CSB)

- ...

### Output voor gemeenteraad

- ...
