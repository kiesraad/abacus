INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street,
                              house_number, house_number_addition, postal_code, locality)
VALUES (1, 1, 'Op Rolletjes', 33, NULL, 'Mobile', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag'),
       (2, 1, 'Testplek', 34, 1000, 'Special', 'Teststraat', '2', 'b', '1234 QY', 'Testdorp'),
       (3, 2, 'Testgebouw', 35, NULL, 'FixedLocation', 'Testweg', '3', NULL, '1234 QA', 'Teststad'),
       (4, 3, 'Studio The Rules', 1, NULL, 'FixedLocation', 'Gerontoplein', '1', NULL, '1337 YQ', 'Juinen'),
       (5, 3, 'Buurtcentrum de Mattenklopper', 2, 1000, 'Special', 'Complexiteitslaan', '2', 'b', '1337 QY',
        'Juinen'),
       (6, 3, 'Positivo Zaal', 3, NULL, 'FixedLocation', 'Kerkweg', '3', NULL, '1337 QA', 'Juinen'),
       (7, 4, 'Studio The Rules', 1, NULL, 'FixedLocation', 'Gerontoplein', '1', NULL, '1337 YQ', 'Juinen'),
       (8, 4, 'Buurtcentrum de Mattenklopper', 2, 1000, 'Special', 'Complexiteitslaan', '2', 'b', '1337 QY',
        'Juinen'),
       (9, 4, 'Positivo Zaal', 3, NULL, 'FixedLocation', 'Kerkweg', '3', NULL, '1337 QA', 'Juinen');
