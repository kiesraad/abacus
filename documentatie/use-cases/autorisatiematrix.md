# Autorisatiematrix Gemeenteraadsverkiezingen

## Achtergrond

Deze matrix beschrijft welke functionaliteiten in Abacus voor welke gebruikersrol beschikbaar zijn.
Het GSB verwerkt de tellingen / processen-verbaal van stembureaus, en genereert haar eigen proces-verbaal.
Vervolgens worden de resultaten van het GSB ingelezen door het CSB (plus eenmaal handmatig invoeren),
die de zetelverdeling vaststelt en daarvoor een proces-verbaal genereert.

## Rollen

- **Beheerder**:
  Kan de applicatie inrichten en klaarzetten voor gebruik.
  Geen bevoegdheden in het uitslagen / telproces.
  Primair bedoeld voor technische medewerkers die verder geen rol in het verkiezingsproces hebben.
- **Coördinator GSB**:
   Inhoudelijk expert die de zittingen van het GSB leidt.
- **Coördinator CSB**:
   Inhoudelijk expert die de zittingen van het CSB leidt.
- **Invoerder GSB**:
  Kan tellingen invoeren tijdens de zitting van het GSB.
- **Invoerder CSB**:
  Kan tellingen invoeren tijdens de zitting van het CSB.

## Rollen en rechten

| Functionaliteit \ Rol                            | Beheerder | Coördinator GSB | Coördinator CSB | Invoerder GSB | Invoerder CSB |
|--------------------------------------------------|:---------:|:---------------:|:---------------:|:-------------:|:-------------:|
| **Voorbereiding**                                |           |                 |                 |               |               |
| Applicatie installeren                           |     X     |                 |                 |               |               |
| Verkiezing configureren                          |     X     |                 |                 |               |               |
| Invoerstations beheren                           |     X     |                 |                 |               |               |
| Stembureaus beheren [^1]                         |     X     |        X        |                 |               |               |
| Gebruikers beheren: alle gebruikers              |     X     |                 |                 |               |               |
| Gebruikers beheren: invoerders GSB [^2]          |           |        X        |                 |               |               |
| Gebruikers beheren: invoerders CSB [^2]          |           |                 |        X        |               |               |
| **Tijdens de zitting GSB**                       |           |                 |                 |               |               |
| Een nieuwe zitting openen                        |           |        X        |                 |               |               |
| Stembureaus beheren [^1]                         |           |        X        |                 |               |               |
| Invoer starten/schorsen/stoppen                  |           |        X        |                 |               |               |
| Tellingen SB invoeren en waarschuwingen oplossen |           |                 |                 |       X       |               |
| Conflicten en waarschuwingen oplossen            |           |        X        |                 |               |               |
| Bezwaren en bijzonderheden SB invoeren           |           |        X        |                 |               |               |
| Volledig ingevoerde tellingen SB's bekijken      |     X     |        X        |                 |       X       |               |
| **Zitting GSB afronden**                         |           |                 |                 |               |               |
| Bezwaren en bijzonderheden zitting GSB invoeren  |           |        X        |                 |               |               |
| Proces-verbaal maken                             |           |        X        |                 |               |               |
| **Zitting CSB**                                  |           |                 |                 |               |               |
| EML_NL bestand zitting GSB importeren            |           |                 |        X        |               |               |
| Resultaten GSB invoeren                          |           |                 |                 |               |       X       |
| Conflicten en waarschuwingen oplossen            |           |                 |        X        |               |               |
| Zetelverdeling vaststellen                       |           |                 |        X        |               |               |
| Proces-verbaal maken                             |           |                 |        X        |               |               |
| **Algemeen**                                     |           |                 |                 |               |               |
| Logs raadplegen                                  |     X     |        X        |        X        |               |               |

[^1]: Stembureaus binnen de gemeente waar gestemd kan worden. Niet GSB(s) of CSB.

[^2]: Zeer gewenst (should have), initieel nog geen gebruikersbeheer voor coördinator.
