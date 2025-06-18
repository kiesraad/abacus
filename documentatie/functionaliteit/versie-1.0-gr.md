# Functionaliteit voor Abacus 1.0 - Gemeenteraadsverkiezingen (concept)

*Dit is een conceptversie die mogelijk nog gewijzigd gaat worden.*

## Versie 1.0: vereist (must have)

*Onderstaande eisen (requirements) moeten in de eerste versie voor gemeenteraadsverkiezingen terugkomen. Zonder deze eisen is het product niet bruikbaar.*

### Gebruikers en rollen

- Gebruikers kunnen lokaal worden aangemaakt met eenvoudige authenticatie, dus alleen een gebruikersnaam en wachtwoord.
- Gebruikers hebben verschillende autorisatieniveaus op basis van de toegewezen rol: Beheerder, Coördinator GSB, Coördinator CSB, Invoerder GSB en Invoerder CSB.

### Inrichting van de applicatie

- Er is een installatieprogramma/-instructie voor de Abacus-server.
- Het EML_NL-bestand met de verkiezingsdefinitie voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de kandidatenlijst voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de stembureaus van een gemeente kan worden geïmporteerd en geëxporteerd.
- De beheerder kan stembureaus aanmaken, aanpassen, verwijderen.
- De beheerder kan op basis van de geïmporteerde gegevens lege modellen genereren (lijst met modeltypes PM)

### Invoeren van uitslagen GSB

- Invoerders kunnen uitslagen van stembureaus invoeren voor DSO en CSO.
- Invoerders kunnen het stembureaucorrigendum voor DSO invoeren.
- Uitslagen worden ingevoerd volgens het vierogenprincipe. Dit betekent dat ze twee keer worden ingevoerd door twee verschillende invoerders.
- Verschillen tussen de twee invoeren oplossen: de coördinator verwijdert een van beide invoeren en laat deze herinvoeren.
- Validatie, consistentiechecks en controleprotocol opmerkelijke uitslagen worden uitgevoerd op de ingevoerde tellingen van stembureaus.

### Uitslagbepaling GSB

- De uitslagen per stembureau kunnen worden opgeteld en dit leidt vervolgens tot de uitslag van het gemeentelijk stembureau (GSB).
- De uitslagen kunnen worden geëxporteerd als XML-bestand volgens de EML_NL-standaard.
- De uitslag van het GSB wordt gegenereerd als proces-verbaal in PDF-formaat.
- De uitslag kan na de eerste zitting worden gecorrigeerd met behulp van een corrigendum.

### Invoeren van uitslagen CSB

- De uitslag van het GSB kan worden geïmporteerd als XML-bestand volgens de EML_NL-standaard.
- Uitslagen worden ingevoerd volgens het vierogenprincipe. Dit betekent dat ze twee keer worden ingevoerd door twee verschillende invoerders. Een import van een EML_NL-bestand telt ook als invoer, waardoor nog maar één handmatige invoer nodig is.
- Verschillen tussen de twee invoeren oplossen: de coördinator verwijdert een van beide invoeren en laat deze herinvoeren.

### Uitslagbepaling CSB

- De zetelverdeling voor de gemeenteraad wordt uitgerekend en de zetels worden aan kandidaten toegewezen.
- De uitslagen kunnen worden geëxporteerd als XML-bestand volgens de EML_NL-standaard.
- De uitslag van het CSB wordt gegenereerd als proces-verbaal in PDF-formaat.

### Ondersteunende functies

- Er is ondersteuning voor het gebruik van Abacus op meerdere werkstations.
- De Abacus-server kan de afwezigheid van een internetverbinding detecteren (airgapdetectie).
- Abacus is beschikbaar voor één open source operating system (Linux) en Microsoft Windows.

## Versie 1.0: zeer gewenst (should have)

*Deze punten zijn zeer gewenst en worden geïmplementeerd als het kan, maar zonder is de software ook bruikbaar.*

- De Abacus-clients kunnen de afwezigheid van een internetverbinding detecteren (airgapdetectie).
- Er vindt logging van gebruikershandelingen plaats.
- Bijhouden van statistieken over gebruik.
- De coördinator GSB kan invoerders van het GSB beheren,
  en de coördinator CSB kan invoerders van het CSB beheren.

## Versie 1.0: gewenst (could have)

*Deze eisen zullen alleen aan bod komen als er tijd genoeg is.*

- De uitslag GSB wordt voorzien van een cryptografische handtekening.
- Aanmaken van _benoemingsbrieven_ en _kennisgevingen die strekken tot geloofsbrief_
- Het PDF-bestand van het proces-verbaal voldoet aan de WCAG-toegankelijkheidseisen.
- Invoer van bezwaren en bijzonderheden per stembureau (afhankelijk van ontwikkeling modellen).
- Verschillen kunnen worden opgelost door nieuwe invoer op lijstniveau.
- Beheer van werkplekken (aanvullen, design).
- De software biedt ondersteuning voor meerdere verkiezingen tegelijkertijd. Dit is een vereiste die we sowieso zullen uitwerken na de GSB-fase, maar hier kan al in deze fase al een aanzet toe worden gedaan.
- De interface is beschikbaar in meerdere talen: Nederlands, Engels, Fries en Papiaments, Nedersaksisch
- Abacus is officieel beschikbaar voor macOS.
- Er is een installatieprogramma voor de Abacus-werkstations.

## Versie 1.0: niet binnen scope (won't have)

*Deze functionaliteit zal in deze iteratie niet aan bod komen, maar kan in de toekomst interessant zijn.*

- Functies voor andere processen dan het invoeren en berekenen van uitslagen.
