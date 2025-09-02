# Functionaliteit voor Abacus 1.0 - Gemeenteraadsverkiezingen (concept)

*Dit is een conceptversie die mogelijk nog gewijzigd gaat worden.*

De eerste versie van Abacus bevat de functionaliteit voor het GSB bij de Gemeenteraadsverkiezingen en wordt gebouwd aan de hand van de onderstaande prioriteitenlijst. Daarna wordt de functionaliteit gebouwd voor CSB en HSB en voor het GSB bij andere verkiezingen. Deze functionaliteit wordt later geprioriteerd.

## Versie 1.0 GSB: vereist (must have)

*Onderstaande eisen (requirements) moeten in de eerste versie voor gemeenteraadsverkiezingen terugkomen. Zonder deze eisen is het product niet bruikbaar.*

### Gebruikers en rollen

- Gebruikers kunnen lokaal worden aangemaakt met eenvoudige authenticatie, dus alleen een gebruikersnaam en wachtwoord.
- Gebruikers hebben verschillende autorisatieniveaus op basis van de toegewezen rol: Beheerder, Coördinator GSB en Invoerder GSB.

### Inrichting van de applicatie

- Er is een installatieprogramma/-instructie voor de Abacus-server.
- Het EML_NL-bestand met de verkiezingsdefinitie voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de kandidatenlijst voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de stembureaus van een gemeente kan worden geïmporteerd.
- De beheerder kan stembureaus aanmaken, aanpassen, verwijderen.
- De beheerder kan op basis van de geïmporteerde gegevens lege documenten genereren: [lijst met modeltypes](https://github.com/kiesraad/abacus/blob/main/documentatie/use-cases/input-output-bestanden.md)

### Invoeren van uitslagen GSB

- Invoerders kunnen uitslagen van stembureaus invoeren voor CSO.
- Uitslagen worden ingevoerd volgens het vierogenprincipe. Dit betekent dat ze twee keer worden ingevoerd door twee verschillende invoerders.
- Verschillen tussen de twee invoeren oplossen: de coördinator verwijdert een van beide invoeren en laat deze herinvoeren.
- Validatie, consistentiechecks en controleprotocol opmerkelijke uitslagen worden uitgevoerd op de ingevoerde tellingen van stembureaus.

### Uitslagbepaling GSB

- De uitslagen per stembureau kunnen worden opgeteld en dit leidt vervolgens tot de uitslag van het gemeentelijk stembureau (GSB).
- De uitslagen kunnen worden geëxporteerd als XML-bestand volgens de EML_NL-standaard.
- De uitslag van het GSB wordt gegenereerd als proces-verbaal in PDF-formaat.
- De uitslag kan na de eerste zitting worden gecorrigeerd met behulp van een corrigendum.

### Ondersteunende functies

- Er is ondersteuning voor het gebruik van Abacus op meerdere werkstations.
- De Abacus-server kan de afwezigheid van een internetverbinding detecteren (airgapdetectie).
- Abacus is beschikbaar voor één open source operating system (Linux) en Microsoft Windows.
- Er vindt logging van gebruikershandelingen plaats.

## Versie 1.0: zeer gewenst (should have)

*Deze punten zijn zeer gewenst en worden geïmplementeerd als het kan, maar zonder is de software ook bruikbaar.*

- Er is een installatieprogramma voor Microsoft Windows.
- De coördinator GSB kan invoerders van het GSB beheren.
  
## Versie 1.0: gewenst (could have)

*Deze eisen zullen alleen aan bod komen als er tijd genoeg is.*

- Invoerders kunnen uitslagen van stembureaus invoeren voor DSO.
- Invoerders kunnen het stembureaucorrigendum voor DSO invoeren.
- De coördinator GSB kan verklaringen n.a.v. validatiechecks uit het controleprotocol invoeren.
- De versie voor Microsoft Windows kan door de Kiesraad worden ondertekend.
- De uitslag GSB wordt voorzien van een cryptografische handtekening.
- De Abacus-clients kunnen de afwezigheid van een internetverbinding detecteren (airgapdetectie).
- Het EML_NL-bestand met de stembureaus van een gemeente kan worden geëxporteerd.
- Invoer van bezwaren en bijzonderheden per stembureau (afhankelijk van ontwikkeling modellen).
- De software biedt ondersteuning voor meerdere verkiezingen tegelijkertijd. 
- Er is een package voor linux.
- Abacus is officieel beschikbaar voor macOS.
- Er is een installatieprogramma voor de Abacus-werkstations.
- Bijhouden van statistieken over gebruik.
- Beheer van werkplekken (aanvullen, design).
- Het PDF-bestand van het proces-verbaal voldoet aan de WCAG-toegankelijkheidseisen.
- De interface is beschikbaar in meerdere talen: Nederlands, Engels, Fries en Papiaments, Nedersaksisch


## Versie 1.0: niet binnen scope (won't have)

*Deze functionaliteit zal in deze iteratie niet aan bod komen, maar kan in de toekomst interessant zijn.*

- Functies voor andere processen dan het invoeren en berekenen van uitslagen.
