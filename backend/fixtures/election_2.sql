INSERT INTO elections (id, name, location, number_of_voters, category, number_of_seats, election_date, nomination_date,
                       status, political_groups)
VALUES (2, 'Municipal Election', 'Heemdamseburg', 100, 'Municipal', 29, '2024-11-30', '2024-11-1',
        'DataEntryInProgress',
        '[
          {
            "number": 1,
            "name": "Political Group A",
            "candidates": [
              {
                "number": 1,
                "initials": "A.",
                "first_name": "Alice",
                "last_name": "Foo",
                "locality": "Amsterdam",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Rotterdam",
                "gender": null
              }
            ]
          }
        ]');

INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, address,
                              postal_code, locality)
VALUES (1, 2, 'Op Rolletjes', 33, NULL, 'Mobile', 'Rijksweg A12 1', '1234 YQ', 'Den Haag'),
       (2, 2, 'Testplek', 34, 1000, 'Special', 'Teststraat 2b', '1234 QY', 'Testdorp');
