# Zetelverdeling crate

Deze crate kan gebruikt worden om de zetelverdeling te berekenen 
en de aanwijzing van de gekozen kandidaten te doen voor een 
Gemeenteraadsverkiezing (GR1 & GR2) of een Waterschapsverkiezing (AB2).
GR2 en AB2 staan voor gemeenteraden en waterschappen met 19 of meer zetels 
en GR1 en AB1 staan voor gemeenteraden en waterschappen met minder dan 19 zetels.
Een Waterschapsverkiezing voor een waterschap van de categorie AB1 wordt niet ondersteund,
er bestaan geen waterschappen van de categorie AB1 meer sinds 2023.

De zetelverdeling en aanwijzing van kandidaten worden elk uitgevoerd in een eigen module 
(respectievelijk `seat_assignment` en `candidate_nomination`).  
Beide modules bevatten ook uitgebreide tests.

Deze crate bevat ook een definitie voor een breuk (`fraction.rs`), 
aangezien alle berekeningen in breuken uitgevoerd worden.