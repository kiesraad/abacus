# Functionaliteit van Abacus: eisen en wensen

De nieuwe uitslagensoftware Abacus zal in meerdere stappen worden ontwikkeld. Eerst wordt de software ontwikkeld voor het GSB (gemeentelijk stembureau), en daarna wordt de functionaliteit uitgebreid naar het HSB (hoofdstembureau) en CSB (centraal stembureau).
De allereerste stap is het maken van een bruikbare demoversie, die begin september 2024 wordt gepubliceerd.

In dit document staan de eisen en wensen voor de demoversie en voor de volledige GSB-versie van Abacus.
In de loop van de ontwikkeltijd zal dit document worden gewijzigd en uitgebreid. De specificaties voor de andere versies zullen op een later moment worden vastgesteld.

## Functionaliteit voor demo Kiesraad begin september 2024

### Vereist (must have)

*Deze eisen (requirements) moeten in het eindresultaat terugkomen. Zonder deze eisen is de demo niet geslaagd.*

- Alle vereisten (must-haves) zijn functioneel en kunnen worden gebruikt in een klikbare demoversie.
- De flow voor de eerste invoer van een stembureau in een gemeente met centrale stemopneming (CSO) is compleet.
- Validatie en consistentiechecks worden uitgevoerd op de uitslagen.
- Er kunnen meerdere stembureaus worden ingevoerd.
- Er is een placeholder-pagina voor het afronden van de zitting.
- De resultaten van de stembureaus worden bij elkaar opgeteld.
- Het proces-verbaal kan worden geëxporteerd als PDF.

### Zeer gewenst (should have)

*Deze punten zijn zeer gewenst, maar zonder is de demo wel geslaagd.*

- De flow voor de tweede invoer van een stembureau in een CSO-gemeente is compleet.
- Er is een statuspagina met daarop de voortgang van de invoer van stembureaus.
- Verschillen tussen de eerste en tweede invoer worden weergegeven en kunnen worden opgelost.
- Bezwaren en bijzonderheden kunnen worden ingevuld tijdens het invoeren van de GSB-zitting.

### Gewenst (could have)

*Deze wensen zullen alleen aan bod komen als er tijd genoeg is.*

- Er is ondersteuning voor het invoeren van gemeenten met een decentrale stemopneming (DSO).
- De frontend wordt aangestuurd vanuit de backend.
- Stembureaus kunnen worden aangemaakt.
- Bezwaren en bijzonderheden kunnen per stembureau worden ingevoerd (bij CSO).

### Niet binnen scope (won't have)

*Deze eisen zullen in deze iteratie niet aan bod komen.*

- Het berekenen van de zetelverdeling bij het centraal stembureau (CSB).
- Het importeren van het EML-bestand met de verkiezingsdefinitie.
- Het importeren van het EML-bestand met de kandidatenlijst.
- Het importeren van het EML-bestand met de stembureaus.
- Het genereren van het EML-bestand met resultaten.
- Authenticatie en autorisatie.
- De corrigenda-workflow voor een tweede zitting.
- Het selecteren van kandidaten en het herschrijven van lijsten na de zetelverdeling.
- Een installatieprogramma (installer).

## Functionaliteit voor GSB-versie 1.0

### Vereist (must have)

*De onderstaande eisen (requirements) moeten in het eindresultaat terugkomen. Zonder deze eisen is het product niet bruikbaar.*

- Gebruikers en rollen:
  - Gebruikers kunnen lokaal worden aangemaakt met eenvoudige authenticatie, dus alleen een gebruikersnaam en wachtwoord.
  - Gebruikers hebben verschillende autorisatieniveaus op basis van de toegewezen rol: Beheerder, Coördinator/verkiezingsleider, Invoerder of Typist (CSO).
- De beheerder kan stembureaus aanmaken.
- Invoerders kunnen uitslagen van stembureaus invoeren.
- Het EML-bestand met de verkiezingsdefinitie voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML-bestand met de kandidatenlijst voor de betreffende verkiezing kan worden geïmporteerd.
- Het EML-bestand met de stembureaus kan worden geïmporteerd.
- Uitslagen worden ingevoerd volgens het vierogenprincipe. Dit betekent dat ze twee keer worden ingevoerd door twee verschillende gebruikers.
- De uitslagen per stembureau kunnen worden opgeteld en dit leidt vervolgens tot de uitslag van het gemeentelijk stembureau (GSB).
- De uitslagen kunnen worden geëxporteerd als XML-bestand volgens de EML-standaard (Election Markup Language).
- De uitslag van het GSB wordt gegenereerd als proces-verbaal in PDF-formaat.
- De processen-verbaal kunnen worden gegenereerd in het Nederlands en Fries.
- Validatie en consistentiechecks

### Zeer gewenst (should have)

*Deze punten zijn zeer gewenst en worden geïmplementeerd als het kan, maar zonder is de software ook bruikbaar.*

- De lijst met stembureaus kan worden geïmporteerd in EML 110b-formaat.
- De uitslag van een stembureau/GSB kan na de eerst uitslagvaststelling worden gecorrigeerd in de vorm van een corrigendum.
- De uitslag GSB wordt voorzien van een cryptografische handtekening.

### Gewenst (could have)

*Deze eisen zullen alleen aan bod komen als er tijd genoeg is.*

- De software biedt ondersteuning voor meerdere verkiezingen tegelijkertijd. Dit is een vereiste die we sowieso zullen uitwerken na de GSB-fase, maar hier kan al in deze fase al een aanzet toe worden gedaan.
- Er is ondersteuning voor het gebruik van Abacus op meerdere werkstations.
- De interface is beschikbaar in meerdere talen: Nederlands, Engels, Fries en Papiaments.

### Niet binnen scope (won't have)

*Deze functionaliteit zal in deze iteratie niet aan bod komen, maar kan in de toekomst interessant zijn.*

- Functies voor andere processen dan het invoeren/berekenen van uitslagen.
