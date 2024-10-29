INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street,
                              house_number, house_number_addition, postal_code, locality)
VALUES (1, 1, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag'),
       (2, 1, 'Testplek', 34, 1000, 'bijzonder', 'Teststraat', '2', 'b', '1234 QY', 'Testdorp'),
       (3, 2, 'Testgebouw', 35, NULL, 'vaste_locatie', 'Testweg', '3', NULL, '1234 QA', 'Teststad'),
       (4, 3, 'Studio The Rules', 1, NULL, 'vaste_locatie', 'Gerontoplein', '1', NULL, '1337 YQ', 'Juinen'),
       (5, 3, 'Buurtcentrum de Mattenklopper', 2, 1000, 'bijzonder', 'Complexiteitslaan', '2', 'b', '1337 QY',
        'Juinen'),
       (6, 3, 'Positivo Zaal', 3, NULL, 'vaste_locatie', 'Kerkweg', '3', NULL, '1337 QA', 'Juinen'),
       (7, 4, 'Studio The Rules', 1, NULL, 'vaste_locatie', 'Gerontoplein', '1', NULL, '1337 YQ', 'Juinen'),
       (8, 4, 'Buurtcentrum de Mattenklopper', 2, 1000, 'bijzonder', 'Complexiteitslaan', '2', 'b', '1337 QY',
        'Juinen'),
       (9, 4, 'Positivo Zaal', 3, NULL, 'vaste_locatie', 'Kerkweg', '3', NULL, '1337 QA', 'Juinen');
