# Planning 2025

## oktober-december 2024

- [M] De applicatie heeft onderdelen voor de rollen beheerder, coördinator en invoerder.
- [S] Bij fouten in de frontend verschijnt een nette foutpagina.
- [S] De frontend is bereikbaar vanuit de backend: de applicatie kan als één geheel gedraaid worden.
- [M] De applicatie wordt voorbereid op het vertalen van de interface (i18n).
- [L] De beheerder kan stembureaus aanmaken, bekijken, bewerken en verwijderen.
- [M] De coördinator heeft inzicht in de status en voortgang van het invoerproces, zonder live updates.
- [L] De tellingsresultaten kunnen als EML_NL-bestand (510b) worden geëxporteerd.
- [M] De invoer kan worden hervat na een onderbreking.
- [S] De invoerder kan de tweede invoer doen, en de tweede invoer wordt definitief gemaakt als deze volledig overeenkomt met de eerste invoer.

## januari-februari 2025

- _Frontend refactoring, nog uit te werken_
- _Implementatie state machine in backend_

- Gebruikers kunnen inloggen met gebruikersnaam en wachtwoord (authenticatie/authn).
- Gebruikers hebben een van de drie rollen beheerder, coördinator of invoerder (autorisatie/authz).
- Gebruikers kunnen worden beheerd door de beheerder/coördinator.
- Er vindt logging van gebruikershandelingen plaats.

- De zetelverdeling voor de gemeenteraad wordt uitgerekend voor de meest voorkomende gevallen (meest voorkomende scenario, bijv. geen loting), en wordt weergegeven op een placeholder-pagina.
- [L] De toewijzing van kandidaten aan de zetels kan worden bepaald (meest voorkomende scenario, bijv. nog geen registratie van overleden kandidaten).

## maart-april 2025

_Een deel moet nog worden doorgeschoven naar latere iteraties._

- [S] Er kan slechts één gebruiker tegelijkertijd hetzelfde stembureau invoeren.
- [S] De tweede invoerder is verplicht een andere gebruiker dan de eerste invoerder.

- [M] Basis in de backend voor alle EML_NL formaten opzetten
- [M] Het EML_NL-bestand met de verkiezingsdefinitie voor de gemeenteraadsverkiezing kan worden geïmporteerd.
- [M] Het EML_NL-bestand met de kandidatenlijst voor de gemeenteraadsverkiezing kan worden geïmporteerd.

- [?] De coördinator kan de eerste zitting openen, schorsen en afronden.
  - _Eerst use cases uitwerken_

- [XL] Nieuwe modellen implementeren
  - _Nog opsplitsen_

- [L] Invoer van lotingsresultaten tijdens de zetelverdeling.
- [L] Het markeren van overleden kandidaten voor de toewijzing van kandidaten.
- [M] De zetelverdeling kan als EML_NL-bestand (520) worden geëxporteerd.

- [M] Verschillen tussen de eerste en tweede invoer worden weergegeven en kunnen worden opgelost door de coördinator.
- [XL] Ondersteuning voor het invoeren in gemeenten met een decentrale stemopneming (DSO).
  - _Nog opsplitsen: invoer DSO PV, output GSB PV, ..._

- [M] De tweede invoerder krijgt een waarschuwing te zien voor verschillen met de eerste invoer.

- [XL] De uitslag kan in een tweede of volgende zitting worden gecorrigeerd met behulp van een corrigendum.
  - _Nog opsplitsen: template stembureau PV, output corrigendum PV voor GSB_

- [M] Het EML_NL-bestand (110b) met de stembureaus van een gemeente kan worden geïmporteerd.
- [S] Het EML_NL-bestand (110b) met de stembureaus van een gemeente kan worden geëxporteerd.

- [S] Code signing van Windows executables

## mei-juni 2025

- De Abacus-server kan de afwezigheid van een internetverbinding detecteren (airgap-detectie).
- De Abacus-clients kunnen de afwezigheid van een internetverbinding detecteren (airgap-detectie).

- Installatieprogramma (installer) voor Windows.
  - code signing?
- Packaging voor Linux-distributies (Debian/Ubuntu).

- De processen-verbaal kunnen worden gegenereerd in het Nederlands en Fries.

## juli-augustus 2025

- _Verschillen kunnen worden opgelost door nieuwe invoer op lijstniveau. [?]_

- Bezwaren en bijzonderheden kunnen worden ingevuld tijdens het invoeren van de GSB-zitting.
- Bezwaren en bijzonderheden kunnen per stembureau worden ingevoerd (bij CSO).
