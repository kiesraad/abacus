# Autorisatiematrix

## Achtergrond

Deze matrix beschrijft welke functionaliteiten in de software voor welk type gebruiker beschikbaar zijn.
De matrix beschrijft de rollen zoals ze voor het Gemeentelijke Stembureau (GSB) / Stembureau Openbaar Lichaam (SOL) worden ingericht.
Het GSB/SOL verwerkt de tellingen / processen-verbaal van stembureaus, en genereert haar eigen proces-verbaal.

## Rollen

| Rol                 | Beschrijving/doel                                                                                                                                                                                         |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Technisch beheerder | Kan de applicatie inrichten en klaarzetten voor gebruik. Geen bevoegdheden in het uitslagen / telproces. Primair bedoeld voor technische medewerkers die verder geen rol in het verkiezingsproces hebben. |
| Coördinator         | Kan stembureaus en gebruikers beheren, zittingen starten, schorsen, conflicten oplossen en processen-verbaal maken.                                                                                       |
| Invoerder           | Kan alleen tellingen invoeren.                                                                                                                                                                            |

## Rollen en rechten

| Functionaliteit / Rol                            | Technisch beheerder | Coördinator | Invoerder |
|--------------------------------------------------|---------------------|-------------|-----------|
| **Voorbereiding zitting/telling GSB**            |                     |             |           |
| Applicatie installeren                           | X                   |             |           |
| Verkiezing configureren                          | X                   |             |           |
| Invoerstations beheren                           | X                   |             |           |
| Stembureaus beheren                              | X                   | X           |           |
| Gebruikers beheren                               | X                   | X           |           |
| **Tijdens de zitting GSB**                       |                     |             |           |
| Een nieuwe zitting openen                        |                     | X           |           |
| Invoer starten/schorsen/stoppen                  |                     | X           |           |
| Tellingen SB invoeren en waarschuwingen oplossen |                     |             | X         |
| Conflicten en waarschuwingen oplossen            |                     | X           |           |
| Bezwaren en bijzonderheden SB invoeren           |                     | X           |           |
| Volledig ingevoerde tellingen SB's bekijken      | X                   | X           | X         |
| **Zitting GSB afronden**                         |                     |             |           |
| Bezwaren en bijzonderheden zitting GSB invoeren  |                     | X           |           |
| Proces-verbaal maken                             |                     | X           |           |
| **Zitting HSB**                                  |                     |             |           |
| Zetelverdeling vaststellen                       |                     | X           |           |
| Proces-verbaal maken                             |                     | X           |           |
| **Algemeen**                                     |                     |             |           |
| Logs raadplegen                                  | X                   | X           | ?         |
