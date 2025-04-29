# GSB: Invoer tweede zitting

N.B.: Alle use cases voor de tweede zitting gelden ook voor elke latere zitting (derde, etc.).

## De invoerders voeren de hertelling in de applicatie in (vlieger)

__Niveau:__ hoog-over, vlieger, 🪁

__Precondities:__

- [De beheerder richt de applicatie in](./beheerder.md#de-beheerder-richt-de-applicatie-in-wolk)
- [Het GSB voert de PV's en eventuele SB corrigenda (DSO) in de applicatie in](./gsb-invoer-eerste-zitting.md#het-gsb-voert-de-pvs-en-eventuele-sb-corrigenda-dso-in-de-applicatie-in-vlieger)

### Hoofdscenario en uitbreidingen

__Trigger:__ Er is een corrigendum PV opgesteld.

__Hoofdscenario:__  

1. De coördinator GSB stelt invoer open voor het stembureau met corrigendum.
2. De invoerders vullen de resultaten van de gecorrigeerde tellingen (alleen de gewijzigde aantallen) in.

__Uitbreidingen:__  
2a. Er zijn verschillen tussen de eerste en de tweede invoer:  
&emsp; 2a1. De coördinator GSB beoordeelt de verschillen tussen de twee invoeren.

### Open punten

- Welke validaties moet de applicatie doen op de invoer? Zelfde als bij invoer eerste zitting.
- Tekst foutmeldingen aanpassen? Om handelingsperspectief te geven als bijv. tellingen voor een kandidaat zijn aangepast, maar geen andere velden (totaal lijst, totaal geldige stemmen, etc).