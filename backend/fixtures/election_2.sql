INSERT INTO elections (id, name, counting_method, election_id, location, domain_id, category, number_of_seats, election_date, nomination_date, political_groups)
-- number_of_seats explicitly set to a value less than 19, to be used in elections with less than 19 seats
VALUES (2, 'Municipal Election', 'CSO', 'Heemdamseburg_2024', 'Heemdamseburg', '0000', 'Municipal', 15, '2024-11-30', '2024-11-01',
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
          },{
            "number": 2,
            "name": "Political Group B",
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

INSERT INTO committee_sessions (id, number, election_id, status, location, start_date_time)
VALUES (2, 1, 2, 'data_entry_in_progress', 'Heemdamseburg', '2024-12-05 09:15:00');

INSERT INTO polling_stations (id, committee_session_id, id_prev_session, name, number, number_of_voters, polling_station_type, address,
                              postal_code, locality)
VALUES (1, 2, NULL, 'Op Rolletjes', 33, NULL, 'Mobile', 'Rijksweg A12 1', '1234 YQ', 'Den Haag'),
       (2, 2, NULL, 'Testplek', 34, 1000, 'Special', 'Teststraat 2b', '1234 QY', 'Testdorp');
