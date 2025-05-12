# Airgap

## De applicatie controleert of er een internetverbinding is (zee)

__Niveau:__ gebruikersdoel, zee  (🌊)

### Hoofdscenario en uitbreidingen

1. Regelmatig: de applicatie stelt vast dat er geen internetverbinding is.

__Uitbreidingen:__  
1a. De server stelt vast dat er een internetverbinding is:  
&emsp; 1a1. De applicatie blokkeert de invoer en aanpassingen aan de configuratie.  
&emsp; 1a2. De applicatie toont een paginavullende foutmelding aan alle gebruikers.  
&emsp; 1a3. De foutpagina verdwijnt zodra het probleem is verholpen.  

1b. Een client stelt vast dat er een internetverbinding is:  
&emsp; 1b1. De betreffende client stuurt een melding naar de server.  
&emsp; 1b2. De applicatie toont een waarschuwing aan alle gebruikers met vermelding van de bron van het probleem.  
&emsp; 1b3. De melding verdwijnt zodra het probleem is verholpen.  

### Open punten

- Wat is regelmatig? Waarschijnlijk elke 30 of 60 seconden.
