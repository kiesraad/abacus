# Inloggen

## De gebruiker logt voor de eerste keer in

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De gebruiker voert de gebruikersnaam en het wachtwoord in die de coördinator heeft gegeven en logt in.
2. De gebruiker kan optioneel de ingevulde naam aanpassen.
3. De gebruiker vult tweemaal een nieuw wachtwoord in.
4. De gebruiker slaat de nieuwe gegevens op.
5. De applicatie controleert de ingevulde gegevens.

__Uitbreidingen:__

5a. De applicatie stelt vast dat het nieuwe wachtwoord korter dan 13 tekens is:
&emsp; 3a1. De gebruiker past het ingevulde wachtwoord aan naar een lengte van minimaal 13 tekens
5b. De applicatie stelt vast dat het nieuwe wachtwoord gelijk is aan de gebruikersnaam:
&emsp; 3b1. De gebruiker past het ingevulde wachtwoord aan naar iets anders dan de gebruikersnaam

### Open punten

- Wanneer mag de gebruiker diens naam aanpassen?

## De gebruiker logt in

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De gebruiker voert de gebruikersnaam en het wachtwoord in en logt in.
2. De applicatie controleert of er al een andere sessie voor deze gebruiker was.

__Uitbreidingen:__

2a. De gebruiker was ingelogd op een andere plek:
&emsp; 3a1. De andere sessies van de gebruiker worden uitgelogd.
