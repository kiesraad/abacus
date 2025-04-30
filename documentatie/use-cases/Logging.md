# Logging

Logging van acties in de applicatie kan helpen bij het oplossen van problemen en afhandelen van incidenten. Tegelijkertijd draait de applicatie op een airgapped netwerk en is de logging daardoor toegankelijk voor de beheerder. Er zijn miniaal drie situaties waarin gebruik wordt gemaakt van de logging: 

- het monitoren van het gebruik van abacus tijdens het invoerproces
- het oplossen van technische problemen of vragen
- het behandelen een incident met de software

## De applicatie logt acties (zee)

__Niveau:__ gebruikersdoel, zee  (🌊)

De applicatie logt acties. Van elke gelogde actie is in elk geval de volgende informatie beschikaar:

- actie: de gebeurtenis of handeling die heeft plaatsgevonden,
- object: waarop de gebeurtenis of handeling effect had (bijv. welk bestand, proces of systeem),
- resultaat: het resultaat van de gebeurtenis of handeling,
- oorsprong: het apparaat of de netwerklocatie van waaruit de gebeurtenis of handeling in gang is gezet,
- actor: identificatie van de persoon die of het proces dat de gebeurtenis in gang heeft gezet
- tijdstempel: datum en tijdstip waarop de gebeurtenis of handling plaatsvond.

### Open punten

- welke gebeurtenissen vragen om melding aan de gebruiker en/of directe actie?

## De beheerder / coordinator bekijkt de logging om het gebruik te monitoren (zee)

__Niveau:__ gebruikersdoel, zee  (🌊)

De beheerder / coordinator bekijkt de gelogde acties om het gebruik te monitoren. Ze kunnen de logging filteren op eigenschappen van de gelogde acties.

### Open punten

- Welke statistiek is relevant voor het monitoren van gebruik?

## De helpdesk bekijkt de logging om het gebruik van Abacus te ondersteunen (zee)

__Niveau:__ gebruikersdoel, zee  (🌊)

De helpdesk vraagt de beheerder / coordinator om de sqlite database op te sturen indien dit bij het oplossen van problemen bij het gebruik behulpzaam kan zijn. De helpdesk bekijkt de logging om te achterhalen wat er aan de hand kan zijn.

## De Kiesraad bekijkt de logging bij het afhandelen van een incident (zee)

__Niveau:__ gebruikersdoel, zee  (🌊)

De Kiesraad gebruikt de logging als informatiebron bij het afhandelen van een incident

### Open punten

- Is er een manier om de compleetheid van de logs te beoordelen?

