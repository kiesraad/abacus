# Zetelverdeling crate

Deze crate kan gebruikt worden om de zetelverdeling te berekenen
en de aanwijzing van de gekozen kandidaten te doen voor een verkiezing.

De zetelverdeling en aanwijzing van kandidaten worden elk uitgevoerd in een eigen module
(respectievelijk `seat_assignment` en `candidate_nomination`).  
Beide modules bevatten ook uitgebreide tests.

Deze crate bevat ook een definitie voor een breuk (`fraction.rs`), aangezien alle berekeningen in breuken uitgevoerd
worden.