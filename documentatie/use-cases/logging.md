# Logging

Logging van acties in de applicatie kan helpen bij het oplossen van problemen en afhandelen van incidenten. Tegelijkertijd draait de applicatie lokaal en is de logging daardoor te manipuleren door de beheerder. Er zijn een aantal situaties waarin gebruik wordt gemaakt van de logging: 

- het monitoren van het gebruik van abacus tijdens het invoerproces
- het behandelen van een incident met de software
- (mogelijk) het oplossen van problemen tijdens het gebruik van Abacus.

## De applicatie logt acties (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

De applicatie logt de interactie van gebruikers d.w.z. alle belangrijke stappen in het proces, accountbeheer, het inrichten van de applicatie, etc.

Een niet-uitputtende lijst van te loggen acties: 

- foutmeldingen
- in- en uitloggen
- im- en exporteren van eml-bestanden
- aanmaken, aanpassen, verwijderen van records in de database zoals verkiezingen, zittingen, gebruikers, stembureaus

Van elke gelogde actie is in elk geval de volgende informatie beschikbaar:

- actie: de gebeurtenis of handeling die heeft plaatsgevonden,
- object: waarop de gebeurtenis of handeling effect had (bijv. welk bestand, proces of systeem),
- resultaat: het resultaat van de gebeurtenis of handeling,
- oorsprong: het apparaat of de netwerklocatie van waaruit de gebeurtenis of handeling in gang is gezet,
- actor: identificatie van de persoon+rol die, of het proces dat de gebeurtenis in gang heeft gezet
- tijdstempel: datum en tijdstip waarop de gebeurtenis of handeling plaatsvond.


## De beheerder / coördinator bekijkt de logging om het gebruik te monitoren (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

De beheerder / coördinator bekijkt de gelogde acties om het gebruik te monitoren. Ze kunnen de logging filteren op eigenschappen van de gelogde acties.

## De Kiesraad bekijkt de logging bij het afhandelen van een incident (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

De Kiesraad gebruikt de logging als informatiebron bij het afhandelen van een incident. Hiervoor kan de volledige database van de betreffende installatie worden opgevraagd.

## Out of scope

### De beheerder / coördinator bekijkt statistieken over het gebruik

__Niveau:__ gebruikersdoel, zee, 🌊

De beheerder / coördinator bekijkt de statistieken over het gebruik van de applicatie met als doel o.a.:
- het maken van de capaciteitsplanning
- het bepalen van doorlooptijden
- het gebruiken als input voor procesverbetering
