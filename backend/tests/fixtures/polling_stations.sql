INSERT INTO elections (id, name, category, election_date, nomination_date, political_groups)
VALUES
(1, 'Municipal Election', 'Municipal', '2024-11-30', '2024-11-1', '[{"number":1,"name":"Political Group A","candidates":[{"number":1,"initials":"A.","first_name":"Alice","last_name":"Foo","locality":"Amsterdam","gender":"Female"},{"number":2,"initials":"C.","first_name":"Charlie","last_name":"Doe","locality":"Rotterdam","gender":null}]}]'),
(2, 'Municipal Election', 'Municipal', '2024-12-31', '2024-12-1', '[{"number":1,"name":"Political Group A","candidates":[{"number":1,"initials":"A.","first_name":"Alice","last_name":"Foo","locality":"Amsterdam","gender":"Female"},{"number":2,"initials":"C.","first_name":"Charlie","last_name":"Doe","locality":"Rotterdam","gender":null}]}]');

INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(1, 1, 'Stembureau "Op Rolletjes"', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag'),
(2, 1, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat', '2', 'b', '1234 QY', 'Testdorp'),
(3, 2, 'Testgebouw', 35, NULL, 'vaste_locatie', 'Testweg', '3', NULL, '1234 QA', 'Teststad');
