# Foutafhandeling in Abacus

In Abacus onderscheiden we de volgende soorten fouten:

- Verbindingsfouten
- Fatale fouten
- Functionele fouten
- Authenticatie-/autorisatiefouten
- 'Niet gevonden'-fouten
- Air-gap-fouten

## Verbindingsfouten
Dit zijn fouten die optreden als de Abacus backend niet bereikbaar is, bijvoorbeeld door netwerkproblemen of omdat Abacus niet draait.

In dit geval toont Abacus middels een pop-up dat er geen verbinding meer is, met de mogelijkheid het opnieuw te proberen.

## Fatale fouten
Dit zijn over het algemeen programmeerfouten, zoals een ongeldige JSON-structuur of een ongeldige actie tijdens het invoeren.

Fatale fouten kunnen ook het resultaat zijn van het moedwillig invoeren van een ongeldige url.

Deze fouten worden afgehandeld middels een 'Abacus is stuk'-foutpagina.

## Functionele fouten
Functionele fouten zijn fouten die te verwachten zijn als gevolg van acties van de gebruiker, en die ook weer hersteld kunnen worden. Dit zijn bijvoorbeeld validatiefouten die door de backend teruggegeven worden.

De afhandeling van deze fouten wordt gespecificeerd per use case en elke fout wordt afgehandeld in de user interface van de betreffende functionaliteit.

## Authenticatie-/autorisatiefouten
Wanneer de gebruiker niet (meer) is ingelogd, toont Abacus de mogelijkheid tot inloggen.

Wanneer de gebruiker een pagina oproept die vanuit diens rol niet toegestaan is, toont Abacus een pagina die dat meldt.

## 'Niet gevonden'-fouten
Deze fout treedt op wanneer de gebruiker naar een url gaat die niet bestaat in Abacus, of naar een pagina gaat die hoort bij een entiteit die niet meer bestaat, zoals bijvoorbeeld een stembureau dat verwijderd is.

Beide fouten worden afgehandeld met een 'De pagina is niet gevonden'-pagina.

## Air-gap-fouten
Als Abacus detecteert dat het internet bereikbaar is en Abacus dus niet air-gapped draait, wordt er een passende foutmelding getoond.

Air-gap-detectie kan zowel in de frontend als in de backend gebeuren en de afhandeling moet nog bepaald worden.
