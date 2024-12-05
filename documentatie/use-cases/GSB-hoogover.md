# Use cases GSB - hoog-over, vlieger 🪁

## Het GSB voert de PV's en eventuele SB corrigenda's (DSO) in de applicatie in

__niveau:__ hoog-over, vlieger, 🪁

__precondities:__

- [GSB installeert de applicatie](./GSB-gebruikersdoelen.md#gsb-installeert-de-applicatie)
- [GSB richt de applicatie in](./GSB-gebruikersdoelen.md#gsb-richt-de-applicatie-in)

### Hoofdscenario en uitbreidingen

__trigger:__ Het geplande tijdstip om invoer te starten breekt aan.

__hoofdscenario__:  

1. De coördinator stelt invoer open.
2. (voor elk SB PV evt. met corrigendum) [De invoerders vullen de resultaten van de tellingen in.](#de-invoerders-vullen-de-resultaten-van-de-tellingen-in)
3. De coördinator sluit de invoer af.
4. De applicatie stelt vast dat voor alle stembureaus resultaten zijn ingevoerd.
5. De applicatie stelt vast dat er geen stembureaus met (geaccepteerde) waarschuwingen zijn.
6. De applicatie genereert de PVs en EMLs etc.

__uitbreidingen__:  
4a. De applicatie stelt vast dat niet voor niet alle stembureaus resultaten zijn ingevoerd:

5a. De applicatie stelt vast dat er stembureaus met waarschuwingen zijn:

### Open punten

- Moet de applicatie een preview van het gegenereerde PV tonen, zodat de coördinator die kan controleren?

## De invoerders vullen de resultaten van de tellingen in

__niveau:__ hoog-over, vlieger, 🪁

### Hoofdscenario en uitbreidingen

__trigger:__ De coördinator ontvangt een SB PV evt. met corrigendum.

__hoofdscenario__:

1. De coördinator geeft het SB PV evt. met corrigendum aan de eerste invoerder.
2. [De eerste invoerder voert de resultaten van de telling in.](./GSB-gebruikersdoelen.md#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in)
3. De coördinator geeft het SB PV evt. met corrigendum aan de tweede invoerder.
4. [De tweede invoerder voert de resultaten van de telling in.](./GSB-gebruikersdoelen.md#de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in)
5. (na eerste en/of tweede invoer) De applicatie stelt vast dat de invoer geen (geaccepteerde) waarschuwingen bevat.
6. De applicatie stelt vast dat beide invoeren gelijk zijn.
7. De applicatie slaat het definitieve resultaat van het stembureau op.

__uitbreidingen__:  
5a. De applicatie stelt vast dat een invoerder waarschuwingen heeft geaccepteerd:  
&emsp; 5a1. De coördinator beoordeelt de geaccepteerde waarschuwingen.

6a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 6a1. [De coördinator lost de verschillen tussen de twee invoeren op.](./GSB-gebruikersdoelen.md#de-coördinator-lost-de-verschillen-tussen-de-twee-invoeren-op)



## Het GSB voert de corrigendum PV's in de applicatie in

__niveau:__ hoog-over, vlieger, 🪁

__precondities:__

- [GSB installeert de applicatie](./GSB-gebruikersdoelen.md#gsb-installeert-de-applicatie)
- [GSB richt de applicatie in](./GSB-gebruikersdoelen.md#gsb-richt-de-applicatie-in)
- [Het GSB voert de PV's in de applicatie in](#het-gsb-voert-de-pvs-en-eventuele-sb-corrigendas-dso-in-de-applicatie-in)

### Hoofdscenario en uitbreidingen

__trigger:__ Er is een corrigendum PV opgesteld.

__hoofdscenario__:  

1. (voor elk corrigendum) De coördinator stelt invoer open voor het stembureau met corrigendum.
2. (voor elk corrigendum) [De invoerders vullen de resultaten van de tellingen in.](#de-invoerders-vullen-de-resultaten-van-de-tellingen-in)
3. De coördinator genereert de PVs en EMLs etc.

__uitbreidingen__:  
...

### Open punten

- Hoe worden de gecorrigeerde tellingen ingevoerd? Volledige invoer van oorspronkelijk PV en corrigendum? Alleen invoer van de aantallen uit het corrigendum?
