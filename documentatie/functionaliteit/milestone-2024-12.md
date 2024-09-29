# Functionaliteit voor milestone december 2024

## Vereist (must have)

*Deze eisen (requirements) moeten in het eindresultaat terugkomen. Zonder deze eisen is de milestone niet geslaagd.*

*De notering S/M/L geeft de ingeschatte grootte van ieder stuk functionaliteit aan: klein (S), middel (M) en groot (L).*

### Algemeen

- [M] De applicatie heeft onderdelen voor de rollen beheerder, coördinator en invoerder.
- [S] Bij fouten in de frontend verschijnt een nette foutpagina.
- [S] De frontend is bereikbaar vanuit de backend: de applicatie kan als één geheel gedraaid worden.
- [M] De applicatie wordt voorbereid op het vertalen van de interface (i18n).

### Beheerder

- [L] De beheerder kan stembureaus aanmaken, bekijken, bewerken en verwijderen.

### Coördinator

- [M] De coördinator heeft inzicht in de status en voortgang van het invoerproces, zonder live updates.
- [L] De zetelverdeling voor de gemeenteraad wordt uitgerekend voor de meest voorkomende gevallen (meest voorkomende scenario, bijv. geen loting), en wordt weergegeven op een placeholder-pagina.
- [L] De tellingsresultaten kunnen als EML_NL-bestand (510b) worden geëxporteerd.

### Invoerder

- [M] De invoer kan worden hervat na een onderbreking.
- [S] De invoerder kan de tweede invoer doen, en de tweede invoer wordt definitief gemaakt als deze volledig overeenkomt met de eerste invoer.

## Zeer gewenst (should have)

*Deze punten zijn zeer gewenst, maar zonder is de milestone wel geslaagd.*

- Gebruikers kunnen inloggen met gebruikersnaam en wachtwoord (authenticatie/authz).
- Gebruikers hebben een van de drie rollen beheerder, coördinator of invoerder (autorisatie/authn).
- De tweede invoerder is verplicht een andere gebruiker dan de eerste invoerder.
- Er kan slechts één gebruiker hetzelfde stembureau invoeren.
- De coördinator kan de zitting openen en afronden.
- Verschillen tussen de eerste en tweede invoer worden weergegeven en kunnen worden opgelost.
- Het EML_NL-bestand met de verkiezingsdefinitie voor de gemeenteraadsverkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de kandidatenlijst voor de gemeenteraadsverkiezing kan worden geïmporteerd.
- Het EML_NL-bestand met de stembureaus van een gemeente kan worden geïmporteerd.
- De toewijzing van kandidaten aan de zetels kan worden bepaald (meest voorkomende scenario, bijv. nog geen registratie van overleden kandidaten).
- De zetelverdeling kan als EML_NL-bestand (520) worden geëxporteerd.

## Gewenst (could have)

*Deze wensen zullen alleen aan bod komen als er tijd genoeg is.*

- Invoer van lotingsresultaten tijdens de zetelverdeling.
- Het markeren van overleden kandidaten voor het starten van de zetelverdeling.
- Ondersteuning voor het invoeren in gemeenten met een decentrale stemopneming (DSO).
- Bezwaren en bijzonderheden kunnen per stembureau worden ingevoerd (bij CSO).
- Bezwaren en bijzonderheden kunnen worden ingevuld tijdens het invoeren van de GSB-zitting.

## Niet binnen scope (won't have)

*Deze eisen zullen in deze iteratie niet aan bod komen.*

- De corrigenda-workflow voor een tweede zitting.
- Een installatieprogramma (installer).
