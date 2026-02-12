# Beheer

## De beheerder richt de applicatie in voor GSB en/of CSB (wolk)

__Niveau:__ hoog-over, wolk, ☁️

### Hoofdscenario en uitbreidingen

1. [De beheerder installeert de applicatie.](#de-beheerder-installeert-de-applicatie-zee)
2. De beheerder maakt voor zichzelf een eerste account en wachtwoord aan.
3. [De beheerder zet het GSB voor de verkiezingen in de applicatie.](#de-beheerder-zet-het-gsb-voor-de-verkiezingen-in-de-applicatie-vis)
4. [De beheerder zet het CSB voor de verkiezingen in de applicatie.](#de-beheerder-zet-het-csb-voor-de-verkiezingen-in-de-applicatie-vis)
5. [De beheerder maakt de gebruikers aan.](#de-beheerder-maakt-de-gebruikers-aan-zee)


## De beheerder installeert de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder bereidt één computer als Abacus-server voor conform de [Aansluitvoorschriften](https://www.kiesraad.nl/adviezen-en-publicaties/publicaties/2025/08/21/aansluit--en-gebruiksvoorschriften).
2. De beheerder downloadt de applicatie.
3. De beheerder plaatst de applicatie op de server.
4. De beheerder start de applicatie.
5. [De applicatie controleert of er een internetverbinding is.](./airgap.md#de-applicatie-controleert-of-er-een-internetverbinding-is-zee)
6. (voor elk invoerstation) De beheerder bereidt de computer als invoerstation voor.
7. (voor elk invoerstation) De beheerder zorgt dat het invoerstation met de server kan verbinden.

__Uitbreidingen:__

1a. De beheerder bereidt één of meerdere reserve-servers voor:  
&emsp; 1a1. De beheerder doorloopt de installatiestappen op alle servers.

4a. De applicatie geeft een foutmelding tijdens het starten:  
&emsp; 4a1. De beheerder lost het probleem op.  
&emsp;&emsp; 4a1a. De beheerder slaagt er niet in het probleem op te lossen:  
&emsp;&emsp;&emsp; 4a1a1. De beheerder neemt contact op met de Kiesraad.


## De beheerder zet het GSB voor de verkiezingen in de applicatie (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. [De beheerder leest de verkiezingsdefinitie (EML 110a) in.](#de-beheerder-leest-de-verkiezingsdefinitie-eml-110a-in-vis)
2. De beheerder selecteert "GSB" als rol van het stembureau.
3. [De beheerder leest de kandidatenlijsten (EML 230b) in.](#de-beheerder-leest-de-kandidatenlijsten-eml-230b-in)
4. [De beheerder leest het bestand met stembureaus en aantal kiesgerechtigden (EML 110b) in.](#de-beheerder-leest-het-bestand-met-stembureaus-en-aantal-kiesgerechtigden-eml-110b-in-vis)
5. De beheerder selecteert het type stemopneming.
6. De beheerder bevestigt het aantal kiesgerechtigden in de gemeente.
7. De applicatie maakt het GSB voor de verkiezing aan.

__Uitbreidingen:__

2a. Er is al een GSB-stembureau voor deze verkiezing en dit gebied:  
&emsp; 2a1. De applicatie staat niet toe de optie "GSB" te selecteren.

4a. De beheerder slaat het invoeren van stembureaus over:  
&emsp; 4a1. (tijdens stap 5) De beheerder voert het aantal kiesgerechtigden in de gemeente handmatig in.  
&emsp; 4a2. (na inrichten applicatie) [De beheerder of coördinator zet de stembureaus in de applicatie.](#de-beheerder-of-coördinator-gsb-zet-de-stembureaus-in-de-applicatie-zee)

6a. De beheerder stelt vast dat het aantal kiesgerechtigden uit het stembureaubestand (EML 110b) niet klopt:
&emsp; 6a1. De beheerder corrigeert het aantal kiesgerechtigden in de applicatie.

6b. Het aantal kiesgerechtigden staat niet in het bestand met stembureaus (EML 110b):  
&emsp; 6b1. De beheerder voert het aantal kiesgerechtigden handmatig in.


## De beheerder zet het CSB voor de verkiezingen in de applicatie (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. [De beheerder leest de verkiezingsdefinitie (EML 110a) in.](#de-beheerder-leest-de-verkiezingsdefinitie-eml-110a-in-vis)
2. De beheerder selecteert "CSB" als rol van het stembureau.
3. [De beheerder leest de kandidatenlijsten (EML 230b) in.](#de-beheerder-leest-de-kandidatenlijsten-eml-230b-in)
4. De applicatie maakt het CSB voor de verkiezing en het GSB als stembureau voor het CSB aan.

__Uitbreidingen:__

2a. Er is al een CSB-stembureau voor deze verkiezing en dit gebied:  
&emsp; 2a1. De applicatie staat niet toe de optie "CSB" te selecteren.


## De beheerder leest de verkiezingsdefinitie (EML 110a) in (vis)

__Niveau:__ subfunctie, vis, 🐟

__Hoofdscenario:__

1. De beheerder leest de verkiezingsdefinitie (EML 110a) in.
2. De beheerder stelt vast dat de hash van de verkiezingsdefinitie klopt.

__Uitbreidingen:__

1a. De applicatie geeft een foutmelding bij het inlezen van de verkiezingsdefinitie (EML 110a):  
&emsp; 1a1. De beheerder stelt vast dat het verkeerde bestand is ingelezen.  
&emsp;&emsp; 1a1a. De beheerder stelt vast dat het bestand geen geldige verkiezingsdefinitie bevat:  
&emsp;&emsp;&emsp; 1a1a1. De beheerder neemt contact op met het CSB.  
&emsp; 1a2. De beheerder leest het correcte bestand in.

2a. De hash van de verkiezingsdefinitie (EML 110a) klopt niet:  
&emsp; 2a1. De beheerder stelt vast dat de hash niet correct is overgenomen.  
&emsp;&emsp; 2a1a. De beheerder stelt vast dat de hash correct is overgenomen:  
&emsp;&emsp;&emsp; 2a1a1. De beheerder neemt contact op met het CSB.  
&emsp; 2a2. De beheerder corrigeert de ingevoerde hash.


## De beheerder leest de kandidatenlijsten (EML 230b) in.

__Niveau:__ subfunctie, vis, 🐟

__Hoofdscenario:__

1. De beheerder leest de kandidatenlijsten (EML 230b) in.
2. De beheerder stelt vast dat de hash van de kandidatenlijsten klopt.

__Uitbreidingen:__

1a. De applicatie geeft een foutmelding bij het inlezen van de kandidantelijsten (EML 230b):  
&emsp; 1a1. De beheerder stelt vast dat het verkeerde bestand is ingelezen.  
&emsp;&emsp; 1a1a. De beheerder stelt vast dat het bestand geen geldige verkiezingsdefinitie bevat:  
&emsp;&emsp;&emsp; 1a1a1. De beheerder neemt contact op met het CSB.  
&emsp; 1a2. De beheerder leest het correcte bestand in.

2a. De hash van de kandidantelijsten (EML 230b) klopt niet:  
&emsp; 2a1. De beheerder stelt vast dat de hash niet correct is overgenomen.  
&emsp;&emsp; 2a1a. De beheerder stelt vast dat de hash correct is overgenomen:  
&emsp;&emsp;&emsp; 2a1a1. De beheerder neemt contact op met het CSB.  
&emsp; 2a2. De beheerder corrigeert de ingevoerde hash.


## De beheerder leest het bestand met stembureaus en aantal kiesgerechtigden (EML 110b) in (vis)

__Niveau:__ subfunctie, vis, 🐟

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder importeert het bestand met de stembureaus en het aantal kiesgerechtigden op gemeenteniveau (EML 110b).
2. De applicatie stelt vast dat het bestand aan de validatieregels voldoet.
3. De beheerder stelt vast dat de stembureaus in de applicatie kloppen met de door de gemeente vooraf gepubliceerde lijst.

__Uitbreidingen:__

2a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus (EML 110b):  
&emsp; 2a1. De beheerder stelt vast dat die het verkeerde bestand heeft ingelezen.  
&emsp;&emsp; 2a1a. De beheerder stelt vast dat het bestand geen geldige lijst met stembureaus bevat:  
&emsp;&emsp;&emsp; 2a1a1. De beheerder neemt contact op met de aanleveraar van het bestand.  
&emsp; 2a2. De beheerder leest het correcte bestand in.

3a. De stembureaus in de applicatie komen niet overeen met de vooraf gepubliceerde lijst:  
&emsp; 3a1. De beheerder past de stembureaus aan.


## De beheerder of coördinator GSB zet de stembureaus in de applicatie (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

__Precondities:__

- De stembureaus zijn niet tijdens [het inrichten van de applicatie](#de-beheerder-richt-de-applicatie-in-voor-gsb-enof-csb-wolk) ingevoerd.
- De invoerfase van de zitting is nog niet gestart. Na het starten van de invoerfase kan alleen de [coördinator nog wijzigingen in de lijst met stembureaus aanbrengen](./gsb-eerste-zitting.md#de-coördinator-gsb-bewerkt-de-stembureaus-tijdens-de-eerste-zitting-zee).

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder importeert het bestand met de stembureaus en het aantal kiesgerechtigden op gemeenteniveau.
2. De applicatie stelt vast dat het bestand aan de validatieregels voldoet.
3. De applicatie negeert het aantal kiesgerechtigden in het bestand.
4. De beheerder stelt vast dat de stembureaus in de applicatie kloppen met de door de gemeente vooraf gepubliceerde lijst.

__Uitbreidingen:__

1a. Er is geen te importeren bestand met stembureaus:  
&emsp; 1a1. De beheerder of coördinator voert de stembureaus handmatig in.

2a. De applicatie geeft een foutmelding bij het inlezen van de lijst met stembureaus:

4a. De stembureaus in de applicatie komen niet overeen met de vooraf gepubliceerde lijst:  
&emsp; 4a1. De beheerder of coördinator past de stembureaus aan.


## De beheerder exporteert de stembureaus (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder exporteert de stembureaus.
2. De beheerder slaat de geëxporteerde stembureaus op, zodat ze geïmporteerd kunnen worden bij een volgende verkiezing.

## De beheerder maakt de gebruikers aan (zee)

__Niveau:__ gebruikersdoel, zee, 🌊

### Hoofdscenario en uitbreidingen

__Hoofdscenario:__

1. De beheerder maakt beheerders aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
2. De beheerder maakt coördinatoren voor het GSB aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
3. De beheerder maakt coördinatoren voor het CSB aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
4. De beheerder maakt invoerders voor het GSB aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
5. De beheerder maakt invoerders voor het CSB aan met een gebruikersnaam, volledige naam en tijdelijk wachtwoord.
6. De beheerder controleert de lijst met gebruikers en stelt vast dat alle gebruikers goed zijn.

__Uitbreidingen:__

4-5a. De beheerder heeft de volledige naam niet van de invoerder die nog toegevoegd moet worden:  
&emsp; 4-5a1. De beheerder maakt een invoerder aan met een gebruikersnaam en tijdelijk wachtwoord, 
  maar zonder volledige naam.  

6a. De lijst met gebruikers moet aangepast worden:  
&emsp; 6a1. De beheerder past de volledige naam aan van een gebruiker.  
&emsp; 6a2. De beheerder stelt een nieuw tijdelijk wachtwoord in voor een gebruiker.  
&emsp; 6a3. De beheerder verwijdert een gebruiker.
