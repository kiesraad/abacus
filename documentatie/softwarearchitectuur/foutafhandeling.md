# Foutafhandeling in Abacus

In Abacus onderscheiden we de volgende soorten fouten:

- Connectie fouten
- Fatale fouten
- Functionele fouten
- Authenticatie/authorizatie fouten
- Niet-gevonden fouten
- Airgap fout

## Connectie fouten
Dit zijn fouten die optreden als de Abacus backend niet bereikbaar is, bijvoorbeeld door netwerk problemen, of omdat Abacus niet draait.

In dit geval toont Abacus een pop-up in het scherm met dat er een fout is opgetreden en het voorstel om het opnieuw te proberen.

## Fatale fouten
Dit zijn over het algemeen programmeer-fouten, zoals een ongeldige JSON-structuur of een ongeldige actie tijdens het invoeren. 

Fatale fouten kunnen ook het resultaat zijn van het moedwillig invoeren van een ongeldige url.

Deze fouten worden afgehandeld middels een "Abacus is stuk" fout pagina.

## Functionele fouten
Functionele fouten zijn fouten die te verwachten zijn als gevolg van acties van de gebruiker, en die ook weer hersteld kunnen worden. Dit zijn bijvoorbeeld validatie fouten die door de backend teruggegeven worden.

De afhandeling van deze fouten wordt gespecificeerd per use case.

## Authenticatie/authorizatie fouten
Wanneer de gebruiker niet (meer) is ingelogd, toont Abacus de mogelijkheid tot inloggen.

Wanneer de gebruiker een pagina oproept die niet toegestaan is, toont Abacus een pagina die dat meldt.

## Niet-gevonden fouten

Deze fout treedt op wanneer de gebruiker naar een url gaat die niet bestaat in Abacus, of naar een pagina gaat die hoort bij een entiteit die niet meer bestaat, zoals bijvoorbeeld een stembureau dat verwijderd is.

Beide fouten worden afgehandeld met een "De pagina is niet gevonden" pagina.

## Airgap fouten
Als Abacus detecteert dat het internet bereikbaar is, wordt er een passende foutmelding getoond.

