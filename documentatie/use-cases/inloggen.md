# Inloggen

## De gebruiker logt voor de eerste keer in

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De gebruiker voert de gebruikersnaam en het wachtwoord in die de coördinator heeft gegeven.
2. De gebruiker vult tweemaal een nieuw wachtwoord in.
3. De applicatie stelt vast dat het ingevulde nieuwe wachtwoord valide is.

__Uitbreidingen:__

2a. De gebruiker wil ook diens naam aanpassen:  
&emsp; 2a1. De gebruiker past de naam aan.

3a. De applicatie stelt vast dat het ingevulde nieuwe wachtwoord korter dan 13 tekens is:  
&emsp; 3a1. De gebruiker past het ingevulde nieuwe wachtwoord aan naar een lengte van minimaal 13 tekens

3b. De applicatie stelt vast dat het ingevulde nieuwe wachtwoord gelijk is aan de gebruikersnaam:  
&emsp; 3b1. De gebruiker past het ingevulde nieuwe wachtwoord aan naar iets anders dan de gebruikersnaam

### Open punten

- Wanneer mag de gebruiker diens naam aanpassen?

## De gebruiker logt in

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De gebruiker voert de gebruikersnaam en het wachtwoord in.
2. De applicatie stelt vast dat er geen andere sessie voor deze gebruiker is.

__Uitbreidingen:__

2a. De gebruiker was al ingelogd op een andere plek:
&emsp; 3a1. De andere sessies van de gebruiker worden uitgelogd.
