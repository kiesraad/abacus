# Airgap

## De applicatie controleert of er een internetverbinding is (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. Regelmatig: de applicatie stelt vast dat er geen internetverbinding is (elke 30 seconden).

__Uitbreidingen:__

1a. De server stelt vast dat er een internetverbinding is:  
&emsp; 1a1. De server blokkeert de invoer en aanpassingen aan de configuratie.  
&emsp; 1a2. De server logt alle details met betrekking tot de geconstateerde internetverbinding.  
&emsp; 1a3. De applicatie toont ingelogde coördinatoren en beheerders een foutmelding met vermelding van de bron van het probleem.  
&emsp; 1a4. De applicatie toont op alle andere clients een paginavullende foutmelding.  
&emsp; 1a5. De foutmeldingen verdwijnen zodra bij de eerstvolgende check blijkt dat het probleem is verholpen.  

1b. Een client stelt vast dat er een internetverbinding is: _(could have versie 1.0 GSB)_  
&emsp; 1b1. De betreffende client stuurt een melding naar de server.  
&emsp; 1b2. De server blokkeert de invoer en aanpassingen aan de configuratie.  
&emsp; 1b3. De server logt alle details met betrekking tot de geconstateerde internetverbinding.  
&emsp; 1b4. De applicatie toont ingelogde coördinatoren en beheerders een foutmelding met vermelding van de bron van het probleem.  
&emsp; 1b5. De applicatie toont op alle andere clients een paginavullende foutmelding.  
&emsp; 1b6. De foutmeldingen verdwijnen zodra bij de eerstvolgende check blijkt dat het probleem is verholpen.  
