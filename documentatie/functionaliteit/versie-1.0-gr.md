# Functionaliteit voor Abacus 1.0 - Gemeenteraadsverkiezingen (concept)

*Dit is een conceptversie die mogelijk nog gewijzigd gaat worden.*

De eerste versie van Abacus bevat de functionaliteit voor het GSB bij de Gemeenteraadsverkiezingen en wordt gebouwd aan de hand van de onderstaande prioriteitenlijst. Daarna wordt de functionaliteit gebouwd voor CSB en HSB en voor het GSB bij andere verkiezingen. Deze functionaliteit wordt later geprioriteerd.

## Versie 1.0 GSB: vereist (must have)

*Onderstaande eisen (requirements) moeten in de eerste versie voor gemeenteraadsverkiezingen terugkomen. Zonder deze eisen is het product niet bruikbaar.*

### Gebruikers en rollen

- ✅ Gebruikers kunnen lokaal worden aangemaakt met eenvoudige authenticatie, dus alleen een gebruikersnaam en wachtwoord.
  [#792](https://github.com/kiesraad/abacus/issues/792)
- ✅ Gebruikers hebben verschillende autorisatieniveaus op basis van de toegewezen rol: Beheerder, Coördinator GSB en Invoerder GSB.
  [#397](https://github.com/kiesraad/abacus/issues/397),
  [#676](https://github.com/kiesraad/abacus/issues/676)

### Inrichting van de applicatie

- ✅ Er is een installatie-instructie voor de Abacus-server.
  [#593](https://github.com/kiesraad/abacus/issues/593)
- ✅ Het EML_NL-bestand met de verkiezingsdefinitie voor de betreffende verkiezing kan worden geïmporteerd.
  [#700](https://github.com/kiesraad/abacus/issues/700)
- ✅ Het EML_NL-bestand met de kandidatenlijsten voor de betreffende verkiezing kan worden geïmporteerd.
  [#794](https://github.com/kiesraad/abacus/issues/794)
- ✅ Het EML_NL-bestand met de stembureaus van een gemeente kan worden geïmporteerd.
  [#800](https://github.com/kiesraad/abacus/issues/800)
- ✅ De beheerder kan stembureaus aanmaken, aanpassen, verwijderen.
  [#396](https://github.com/kiesraad/abacus/issues/396)
- ✅ De beheerder kan op basis van de geïmporteerde gegevens [lege documenten genereren](../use-cases/input-output-bestanden.md)
  [#1783](https://github.com/kiesraad/abacus/issues/1783)

### Invoeren van uitslagen GSB

- ✅ Invoerders kunnen uitslagen van stembureaus invoeren voor CSO.
  [#3](https://github.com/kiesraad/abacus/issues/3),
  [#21](https://github.com/kiesraad/abacus/issues/21),
  [#95](https://github.com/kiesraad/abacus/issues/95),
  [#96](https://github.com/kiesraad/abacus/issues/96),
  [#97](https://github.com/kiesraad/abacus/issues/97),
  [#1545](https://github.com/kiesraad/abacus/issues/1545)
- ✅ Uitslagen worden ingevoerd volgens het vierogenprincipe. Dit betekent dat ze twee keer worden ingevoerd door twee verschillende invoerders.
  [#705](https://github.com/kiesraad/abacus/issues/705),
  [#698](https://github.com/kiesraad/abacus/issues/698),
  [#1095](https://github.com/kiesraad/abacus/issues/1095)
- ✅ Verschillen tussen de twee invoeren oplossen: de coördinator verwijdert een van beide invoeren en laat deze herinvoeren.
  [#130](https://github.com/kiesraad/abacus/issues/130)
- ✅ Validatie, consistentiechecks en controleprotocol opmerkelijke uitslagen worden uitgevoerd op de ingevoerde tellingen van stembureaus.
  [#15](https://github.com/kiesraad/abacus/issues/15),
  [#99](https://github.com/kiesraad/abacus/issues/99),
  [#1545](https://github.com/kiesraad/abacus/issues/1545)

### Uitslagbepaling GSB

- ✅ De uitslagen per stembureau kunnen worden opgeteld en dit leidt vervolgens tot de uitslag van het gemeentelijk stembureau (GSB).
  [#124](https://github.com/kiesraad/abacus/issues/124)
- ✅ De uitslagen kunnen worden geëxporteerd als XML-bestand volgens de EML_NL-standaard.
  [#546](https://github.com/kiesraad/abacus/issues/546)
- ✅ De uitslag van het GSB wordt gegenereerd als proces-verbaal in PDF-formaat.
  [#124](https://github.com/kiesraad/abacus/issues/124)
- ⏳ De uitslag kan na de eerste zitting worden gecorrigeerd met behulp van een corrigendum.
  [#1109](https://github.com/kiesraad/abacus/issues/1109),
  [#1885](https://github.com/kiesraad/abacus/issues/1885),
  [#1886](https://github.com/kiesraad/abacus/issues/1886)

### Ondersteunende functies

- ✅ Er is ondersteuning voor het gebruik van Abacus op meerdere werkstations.
  [#3](https://github.com/kiesraad/abacus/issues/3)
- ✅ De Abacus-server kan de afwezigheid van een internetverbinding detecteren (airgapdetectie).
  [#1066](https://github.com/kiesraad/abacus/issues/1066)
- ✅ Abacus is beschikbaar voor één open source operating system (Linux) en Microsoft Windows.
  [#644](https://github.com/kiesraad/abacus/issues/644)
- ✅ Er vindt logging van gebruikershandelingen plaats.
  [#793](https://github.com/kiesraad/abacus/issues/793)

## Versie 1.0: zeer gewenst (should have)

*Deze punten zijn zeer gewenst en worden geïmplementeerd als het kan, maar zonder is de software ook bruikbaar.*

- 📋 Er is een installatieprogramma voor Microsoft Windows.
  [#1096](https://github.com/kiesraad/abacus/issues/1096)
- ✅ De coördinator GSB kan invoerders van het GSB beheren.
  [#2180](https://github.com/kiesraad/abacus/pull/2180)
- ⏳ De coördinator GSB kan de uitslag van een stembureau bekijken en eventueel verwijderen.
  [#1812](https://github.com/kiesraad/abacus/issues/1812)

## Versie 1.0: gewenst (could have)

*Deze eisen zullen alleen aan bod komen als er tijd genoeg is.*

- ⏳ De versie voor Microsoft Windows kan door de Kiesraad worden ondertekend.
  [#1068](https://github.com/kiesraad/abacus/issues/1068)
- 📋 Wijzigingen in de lijst met stembureaus (ten opzichte van de gepubliceerde lijst) worden door Abacus in het proces-verbaal vermeldt.
  [#1865](https://github.com/kiesraad/abacus/issues/1865)
- 📋 De presentielijst van de GSB-zitting kan in Abacus worden ingevuld.
  [#1543](https://github.com/kiesraad/abacus/issues/1543)
- 📋 De Abacus-clients kunnen de afwezigheid van een internetverbinding detecteren (airgapdetectie).
  [#1067](https://github.com/kiesraad/abacus/issues/1067)
- 📋 Bezwaren en bijzonderheden van de GSB-zitting kunnen in Abacus worden ingevuld.
  [#803](https://github.com/kiesraad/abacus/issues/803)
- 📋 Invoerders kunnen uitslagen van stembureaus invoeren voor DSO.
  [#798](https://github.com/kiesraad/abacus/issues/798)
- 📋 Invoerders kunnen het stembureaucorrigendum voor DSO invoeren.
  [#798](https://github.com/kiesraad/abacus/issues/798)
- 📋 De coördinator GSB kan verklaringen n.a.v. validatiechecks uit het controleprotocol invoeren.
  [#1516](https://github.com/kiesraad/abacus/issues/1516)
- 📋 De uitslag GSB wordt voorzien van een cryptografische handtekening (t.b.v. import in OSV2020).
  [#1665](https://github.com/kiesraad/abacus/issues/1665)
- 📋 Het EML_NL-bestand met de stembureaus van een gemeente kan worden geëxporteerd.
  [#801](https://github.com/kiesraad/abacus/issues/801)
- 📋 Er is een installatie-package voor Linux.
  [#1069](https://github.com/kiesraad/abacus/issues/1069)
- 📋 Er is een installatieprogramma voor de Abacus-werkstations.
- 📋 Bijhouden van statistieken over gebruik.
  [#1792](https://github.com/kiesraad/abacus/issues/1792)
- 📋 Beheer van werkplekken.
  [#1913](https://github.com/kiesraad/abacus/issues/1913)
- 📋 Het PDF-bestand van het proces-verbaal voldoet aan de WCAG-toegankelijkheidseisen.
- 📋 De interface is beschikbaar in meerdere talen: Nederlands, Engels, Fries en Papiaments, Nedersaksisch.

## Versie 1.0: niet binnen scope (won't have)

*Deze functionaliteit zal in deze iteratie niet aan bod komen, maar kan in de toekomst interessant zijn.*

- ❌ Invoer van bezwaren en bijzonderheden per stembureau.
  [#799](https://github.com/kiesraad/abacus/issues/799)
- ❌ Abacus is officieel beschikbaar voor macOS.
- ❌ Functies voor andere processen dan het invoeren en berekenen van uitslagen.
