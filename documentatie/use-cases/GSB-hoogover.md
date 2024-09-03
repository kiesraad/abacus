# Use cases GSB - hoog-over, vlieger 🪁

## 1. Het GSB voert de PV's en eventuele SB corrigenda's (DSO) in de applicatie in

__niveau:__ hoog-over, vlieger, 🪁

__precondities:__

- [GSB installeert de applicatie](./GSB-gebruikersdoelen.md#3-gsb-installeert-de-applicatie)
- [GSB richt de applicatie in](./GSB-gebruikersdoelen.md#4-gsb-richt-de-applicatie-in)

### 1.1. Hoofdscenario en uitbreidingen

__trigger:__ Het geplande tijdstip om invoer te starten breekt aan.

__hoofdscenario__:  

1. De coördinator stelt invoer open.
2. (voor elk SB PV evt met corrigendum) [De invoerders vullen de resultaten van de tellingen in.](#2-de-invoerders-vullen-de-resultaten-van-de-tellingen-in)
3. De coördinator sluit de invoer af.
4. De applicatie genereert de PVs en emls etc.

__uitbreidingen__:  
3a. De applicatie stelt vast dat niet voor niet alle stembureaus resultaten zijn ingevoerd:  
3b. De applicatie stelt vast dat er stembureaus met waarschuwingen zijn:  

### 1.2. Open punten

- Moet de applicatie een preview van het gegenereerde PV tonen, zodat de coördinator die kan controleren?

## 2. De invoerders vullen de resultaten van de tellingen in

__niveau:__ hoog-over, vlieger, 🪁

### 2.1. Hoofdscenario en uitbreidingen

__trigger:__ De coördinator ontvangt een SB PV evt met corrigendum.

__hoofdscenario__:

1. De coördinator geeft het SB PV evt met corrigendum aan de eerste invoerder.
2. [De eerste invoerder voert de resultaten van de telling in.](./GSB-gebruikersdoelen.md#1-de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in)
3. De coördinator geeft het SB PV evt met corrigendum aan de tweede invoerder.
4. [De tweede invoerder voert de resultaten van de telling in.](./GSB-gebruikersdoelen.md#1-de-eerste-of-tweede-invoerder-voert-de-resultaten-van-de-telling-in)
5. De applicatie stelt vast dat beide invoeren gelijk zijn.
6. De applicatie slaat het resultaat op.

__uitbreidingen__:  
5a. De applicatie stelt vast dat beide invoeren niet gelijk zijn:  
&emsp; 5a1. [De coördinator lost de verschillen tussen de twee invoeren op.](./GSB-gebruikersdoelen.md#2-de-coördinator-lost-de-verschillen-tussen-de-twee-invoeren-op)

## 3. Het GSB voert de corrigendum PV's in de applicatie in

__niveau:__ hoog-over, vlieger, 🪁

__precondities:__

- [GSB installeert de applicatie](./GSB-gebruikersdoelen.md#3-gsb-installeert-de-applicatie)
- [GSB richt de applicatie in](./GSB-gebruikersdoelen.md#4-gsb-richt-de-applicatie-in)
- [Het GSB voert de PV's in de applicatie in](#1-het-gsb-voert-de-pvs-en-eventuele-sb-corrigendas-dso-in-de-applicatie-in)

### 3.1. Hoofdscenario en uitbreidingen

__trigger:__ Er is een corrigendum PV opgesteld.

__hoofdscenario__:  

1. (voor elk corrigendum) De coördinator stelt invoer open voor het stembureau met corrigendum.
2. (voor elk corrigendum) [De invoerders vullen de resultaten van de tellingen in.](#2-de-invoerders-vullen-de-resultaten-van-de-tellingen-in)
3. De coördinator genereert de PVs en emls etc.

__uitbreidingen__:  
...

### 3.2. Open punten

- Hoe worden de gecorrigeerde tellingen ingevoerd? Volledige invoer van oorspronkelijk PV en corrigendum? Alleen invoer van de aantallen uit het corrigendum?
