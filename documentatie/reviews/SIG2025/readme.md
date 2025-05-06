# SIG-onderzoek broncode en methodiek Abacus

Op verzoek van de Kiesraad heeft de Software Improvement Group (SIG) het ontwikkel- en voortbrengingsproces van Abacus geanalyseerd en advies gegeven over mogelijke verbeteringen. SIG heeft de kwaliteit van de broncode en de gekozen methodiek beoordeeld. De applicatie is in ontwikkeling, daarom is het een goed moment om een externe partij kritisch te laten meekijken en bij te sturen waar nodig. Het advies is goed ontvangen en de aanbevelingen worden opgepakt. 

# Omgang met aanbevelingen uit het SIG-onderzoek
Hieronder een overzicht van de aanbevelingen en de manier waarop we ermee omgaan. 
De aanbevelingen uit het SIG rapport zijn waar mogelijk vertaald in issues. 

## Toets kwaliteit en onderhoudbaarheid

### Aanbeveling: onderhoudbaarheid als onderdeel van de 'Definition of Done'

[Kwaliteit - onderhoudbaarheid] Maak de onderhoudbaarheid onderdeel van de ‘Definition of Done’ met het doel om ruim 4 sterren (SIG, of equivalent) te scoren, rapporteer periodiek of laat extern toetsen, begin met extra aandacht voor de unit-metrieken.

#### Aanpak

Het extern toetsen en de wens om hierbij bovengemiddeld te scoren is onderdeel van het test- en kwaliteitsbeleid van het ontwikkelteam. Naast SIGRID worden ook resultaten uit andere automatische tools benut zoals Codecov en de OSS Review Toolkit.

## Architectuur

### Aanbeveling: actualiseer architectuurbeschrijvingen

[Methodiek/Architectuur] Actualiseer de architectuurbeschrijvingen en synchroniseer de beschreven en gebouwde architectuur, zodat er geen afwijkingen meer zijn en beide synchroon blijven. Stuur op een modulaire architectuur waardoor de componenten in isolatie kunnen worden aangepast en getest.

#### Aanpak

De architectuurplaatjes zijn geactualiseerd. De aanbeveling over architectuur hebben we meegenomen in de frontend refactor en we hebben een aanvullende analyse van de backend-code gedaan. Samen met SIG wordt gewerkt aan de analyse van de code voor onze usecase. 

Afbeeldingen aanpassen: https://github.com/kiesraad/abacus/issues/987  
Modulariteit backend-modules: https://github.com/kiesraad/abacus/issues/988 (met bijbehorende PR's)  
Frontend architectuurdocumentatie: https://github.com/kiesraad/abacus/issues/989  

## Methodiek

SIG doet meerdere aanbevelingen voor de ontwikkelmethodiek, over de richtlijnen en werkverdeling. 

### Aanbeveling: richtlijnen

[Methodiek] Stel project-overstijgende richtlijnen voor de code op die getoetst kunnen worden in elk ticket en/of elke sprint (Definition of Done /Peer reviews).

#### Aanpak

De richtlijnen voor de code zijn onderdeel van de richtlijnen voor het ontwikkelproces: https://github.com/kiesraad/abacus/tree/main/documentatie/ontwikkelproces 

Ten opzichte van de documentatie die SIG heeft onderzocht zijn al meer concrete richtlijnen opgenomen (nav retro december 2024): https://github.com/kiesraad/abacus/commit/3de3b3cad307a7ac17a8d0e0f70c82d074cf6552

De richtlijnen voor de code zijn op hoofdlijnen geformuleerd. Het gaat uiteindelijk om wat we met elkaar doen. Het team heeft de wens om niet meer vast te leggen dan wat nodig is om het werk goed te doen. We zoeken naar een manier om de richtlijnen aan te vullen en recht te doen aan de aanbeveling van SIG. Hiervoor gebruiken we de onboarding van de eerstvolgende nieuwe collega als praktisch toetsmoment.

### Aanbeveling: kleinere tickets

[Methodiek] Maak aanpassingen in de werkwijze, zodat er ook kleinere tickets worden gepland en uitgevoerd.

#### Aanpak

Ja! Deze aanbeveling is op basis van november 2024. In de december-retro hebben we dezelfde conclusie getrokken. Hier letten we op bij het verdelen van het werk en het aanmaken van issues en eventuele sub-issues om dit doel te bereiken. 

Het verslag van de retro staat op de interne repository: 
https://github.com/kiesraad/abacus-internal/blob/main/projectmanagement/retros/retro-2024-12-16.md

## Planning

SIG doet meerdere aanbevelingen voor de planning, over de korte en langere termijn. 

### Aanbeveling: planning op korte termijn 

[Planning] Actualiseer periodiek de schattingen en extrapolaties (omvang en mate van afronding) gedurende fase 1 zodat de einddatum steeds nauwkeuriger kan worden vastgesteld.

#### Aanpak

Met het oog op de naderende deadline hebben we in Q1 het hele project vanuit juridisch en procesmatig perspectief onder de loep genomen, om zeker te weten dat we qua planning en aanpak goed zitten. Hierbij zijn usecases aangepast en prioriteiten bijgesteld. 

Naar aanleiding hiervan worden de schattingen over de voortgang aangepast, om zo grip te houden op een tijdige afronding. De aanbeveling van SIG om voorzichtig te zijn met nieuwe functionaliteit en scope-creep neemt het team zich ter harte. 

### Aanbeveling: planning lange termijn 

[Planning] Werk de scope van fase 2 verder uit om meer zekerheid te verkrijgen over de omvang van fase 2 (is fase 2
daadwerkelijk kleiner dan fase 1 en klein genoeg om binnen gestelde tijd en budget te realiseren?).

#### Aanpak

De gedetailleerde planning voor de lange termijn is nog niet uitgewerkt. Dit verwachten we in Q3 concreet te kunnen gaan maken. 

