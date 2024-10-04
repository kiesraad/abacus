# Functionaliteit voor Abacus 1.0 - Gemeenteraadsverkiezingen 2026 (concept)

*Dit is een conceptversie die mogelijk nog gewijzigd gaat worden.*

## Versie 1.0: vereist (must have)

*Onderstaande eisen (requirements) moeten in de eerste versie voor gemeenteraadsverkiezingen terugkomen. Zonder deze eisen is het product niet bruikbaar.*

### Gebruikers en rollen

- Gebruikers kunnen lokaal worden aangemaakt met eenvoudige authenticatie, dus alleen een gebruikersnaam en wachtwoord.
- Gebruikers hebben verschillende autorisatieniveaus op basis van de toegewezen rol: Beheerder, Coördinator of Invoerder.

### Inrichting van de applicatie

- Er is een installatieprogramma/-instructie voor de Abacus-server.
- Het EML_NL-bestand met de verkiezingsdefinitie voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de kandidatenlijst voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de stembureaus van een gemeente kan worden geïmporteerd.
- De beheerder kan stembureaus aanmaken.

### Invoeren van resultaten

- Invoerders kunnen uitslagen van stembureaus invoeren voor DSO en CSO.
- Uitslagen worden ingevoerd volgens het vierogenprincipe. Dit betekent dat ze twee keer worden ingevoerd door twee verschillende invoerders.
- Verschillen tussen de twee invoeren worden opgelost door de coördinator.
- Validatie en consistentiechecks (controleprotocol) worden uitgevoerd op de ingevoerde tellingen van stembureaus.

### Uitslagbepaling

- De uitslagen per stembureau kunnen worden opgeteld en dit leidt vervolgens tot de uitslag van het gemeentelijk stembureau (GSB).
- De zetelverdeling voor de gemeenteraad wordt uitgerekend.
- De uitslagen kunnen worden geëxporteerd als XML-bestand volgens de EML_NL-standaard.
- De uitslag van het GSB wordt gegenereerd als proces-verbaal in PDF-formaat.
- De processen-verbaal kunnen worden gegenereerd in het Nederlands en Fries.
- De uitslag kan na de eerste zitting worden gecorrigeerd met behulp van een corrigendum.

### Ondersteunende functies

- Er is ondersteuning voor het gebruik van Abacus op meerdere werkstations.
- Er vindt logging van gebruikershandelingen plaats.
- Abacus is beschikbaar voor één open source operating system (Linux) en Microsoft Windows

## Versie 1.0: zeer gewenst (should have)

*Deze punten zijn zeer gewenst en worden geïmplementeerd als het kan, maar zonder is de software ook bruikbaar.*

- De uitslag GSB wordt voorzien van een cryptografische handtekening.
- Het PDF-bestand van het proces-verbaal voldoen aan de WCAG-toegankelijkheidseisen.
- Verschillen kunnen worden opgelost door nieuwe invoer op lijstniveau.
- Bijhouden van statistieken over gebruik.
- Aanmaken van geloofsbrieven.

## Versie 1.0: gewenst (could have)

*Deze eisen zullen alleen aan bod komen als er tijd genoeg is.*

- Invoer van bezwaren en bijzonderheden per stembureau (afhankelijk van ontwikkeling modellen).
- Beheer van werkplekken (aanvullen, design).
- De software biedt ondersteuning voor meerdere verkiezingen tegelijkertijd. Dit is een vereiste die we sowieso zullen uitwerken na de GSB-fase, maar hier kan al in deze fase al een aanzet toe worden gedaan.
- De interface is beschikbaar in meerdere talen: Nederlands, Engels, Fries en Papiaments.
- Abacus is beschikbaar voor macOS.
- Er is een installatieprogramma voor de Abacus-werkstations.

## Versie 1.0: niet binnen scope (won't have)

*Deze functionaliteit zal in deze iteratie niet aan bod komen, maar kan in de toekomst interessant zijn.*

- Functies voor andere processen dan het invoeren en berekenen van uitslagen.
